import asyncio
import logging
import time
from threading import Lock
from typing import Literal

from PIL import Image

from app.core.config import get_settings
from app.core.model_manager import model_manager

logger = logging.getLogger(__name__)

PaddleTask = Literal["ocr", "table", "chart", "formula", "spotting", "seal"]

PROMPTS: dict[str, str] = {
    "ocr": "OCR:",
    "table": "Table Recognition:",
    "formula": "Formula Recognition:",
    "chart": "Chart Recognition:",
    "spotting": "Spotting:",
    "seal": "Seal Recognition:",
}


def _preprocess_for_spotting(
    image: Image.Image, upscale_threshold: int
) -> Image.Image:
    """Upscale small images 2× for the spotting task to improve accuracy."""
    orig_w, orig_h = image.size
    if orig_w < upscale_threshold and orig_h < upscale_threshold:
        try:
            resample = Image.Resampling.LANCZOS
        except AttributeError:
            resample = Image.LANCZOS  # type: ignore[attr-defined]
        image = image.resize((orig_w * 2, orig_h * 2), resample)
    return image


class PaddleOCRVLService:
    def __init__(self) -> None:
        self._model = None
        self._processor = None
        self._device = "cpu"
        self._loaded = False
        self._load_error: str | None = None
        self._inference_lock = Lock()
        self._async_lock = asyncio.Lock()

    def unload(self) -> None:
        """Explicitly unload the model and free GPU memory."""
        if not self._loaded:
            return

        logger.info("Unloading PaddleOCR-VL model and clearing GPU memory")

        from app.core.model_manager import _strip_accelerate_hooks
        _strip_accelerate_hooks(self._model)

        if self._model is not None:
            del self._model
        if self._processor is not None:
            del self._processor
        self._model = None
        self._processor = None
        self._loaded = False
        self._load_error = None

        from app.core.model_manager import _force_free_gpu_memory
        _force_free_gpu_memory()

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def _clear_gpu_memory(self) -> None:
        """Clear GPU memory before loading a new model."""
        try:
            import gc
            import torch

            for _ in range(3):
                gc.collect()

            if torch.cuda.is_available():
                torch.cuda.synchronize()
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                torch.cuda.reset_peak_memory_stats()
                logger.info("GPU memory cleared before loading model")
        except Exception as exc:
            logger.warning("Failed to clear GPU memory: %s", exc)

    def load(self) -> None:
        if self._loaded:
            return
        if self._load_error:
            raise RuntimeError(self._load_error)

        # Notify model manager to unload other models if needed
        model_manager.before_load("paddle_ocr")

        # Clear GPU memory before loading new model
        self._clear_gpu_memory()

        settings = get_settings()
        try:
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor

            dtype = getattr(torch, settings.PADDLE_OCR_TORCH_DTYPE, torch.bfloat16)
            device = settings.PADDLE_OCR_DEVICE
            if device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA unavailable, falling back to CPU")
                device = "cpu"

            logger.info("Loading PaddleOCR-VL model: %s", settings.PADDLE_OCR_MODEL_ID)
            model = AutoModelForImageTextToText.from_pretrained(
                settings.PADDLE_OCR_MODEL_ID,
                dtype=dtype,
            )
            processor = AutoProcessor.from_pretrained(
                settings.PADDLE_OCR_MODEL_ID,
            )

            self._model = model.eval().to(device)
            self._processor = processor
            self._device = device
            self._loaded = True
            logger.info("PaddleOCR-VL model loaded on %s", device)
        except Exception as exc:
            self._load_error = str(exc)
            logger.exception("Failed to load PaddleOCR-VL model")
            raise RuntimeError(f"Failed to load PaddleOCR-VL model: {exc}") from exc

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load()

    def _run_recognition(
        self,
        image: Image.Image,
        task: str,
        max_new_tokens: int | None = None,
    ) -> str:
        self._ensure_loaded()
        settings = get_settings()
        tokens = max_new_tokens or settings.PADDLE_OCR_MAX_NEW_TOKENS

        if task not in PROMPTS:
            raise ValueError(f"Invalid task '{task}'. Must be one of: {', '.join(PROMPTS)}")

        # Ensure image is RGB
        image = image.convert("RGB")

        # Spotting-specific preprocessing: upscale small images
        if task == "spotting":
            image = _preprocess_for_spotting(
                image, settings.PADDLE_OCR_SPOTTING_UPSCALE_THRESHOLD
            )

        # Pixel budget: higher for spotting, standard for other tasks
        max_pixels = (
            settings.PADDLE_OCR_SPOTTING_MAX_PIXELS
            if task == "spotting"
            else settings.PADDLE_OCR_DEFAULT_MAX_PIXELS
        )

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": PROMPTS[task]},
                ],
            }
        ]

        with self._inference_lock:
            processor = self._processor
            min_pixels = getattr(processor.image_processor, "min_pixels", 224)

            inputs = processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
                images_kwargs={
                    "size": {
                        "shortest_edge": min_pixels,
                        "longest_edge": max_pixels,
                    }
                },
            ).to(self._model.device)

            input_len = inputs["input_ids"].shape[-1]
            outputs = self._model.generate(**inputs, max_new_tokens=tokens)
            # Decode only the generated tokens (skip the prompt)
            return processor.decode(outputs[0][input_len:-1])

    async def recognize(
        self,
        image: Image.Image,
        task: str = "ocr",
        max_new_tokens: int | None = None,
    ) -> tuple[str, float]:
        start = time.perf_counter()
        async with self._async_lock:
            result = await asyncio.to_thread(
                self._run_recognition,
                image,
                task,
                max_new_tokens,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

    async def analyze_pdf_pages(
        self,
        images: list[Image.Image],
        task: str = "ocr",
        max_new_tokens: int | None = None,
    ) -> list[tuple[int, str, float]]:
        async def _process_page(page_number: int, image: Image.Image) -> tuple[int, str, float]:
            result, elapsed_ms = await self.recognize(
                image=image,
                task=task,
                max_new_tokens=max_new_tokens,
            )
            return page_number, result, elapsed_ms

        tasks = [
            _process_page(page_number, image)
            for page_number, image in enumerate(images, start=1)
        ]
        return list(await asyncio.gather(*tasks))


paddle_ocr_service = PaddleOCRVLService()

# Register with model manager
model_manager.register_service("paddle_ocr", paddle_ocr_service)
