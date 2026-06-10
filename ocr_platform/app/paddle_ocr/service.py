import asyncio
import logging
import time
from threading import Lock
from typing import Literal

from PIL import Image

from app.core.config import get_settings
from app.core.model_manager import model_manager

logger = logging.getLogger(__name__)

PaddleTask = Literal["ocr", "table", "chart", "formula"]

PROMPTS: dict[str, str] = {
    "ocr": "OCR:",
    "table": "Table Recognition:",
    "formula": "Formula Recognition:",
    "chart": "Chart Recognition:",
}


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
        
        # Clear model and processor references
        self._model = None
        self._processor = None
        self._loaded = False
        
        # Force garbage collection
        import gc
        gc.collect()
        
        # Clear CUDA cache if available
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                logger.info("GPU memory cleared successfully")
        except Exception as exc:
            logger.warning("Failed to clear GPU cache: %s", exc)

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
            
            # Force garbage collection
            gc.collect()
            
            # Clear CUDA cache if available
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
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
            from transformers import AutoModelForCausalLM, AutoProcessor

            dtype = getattr(torch, settings.PADDLE_OCR_TORCH_DTYPE, torch.bfloat16)
            device = settings.PADDLE_OCR_DEVICE
            if device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA unavailable, falling back to CPU")
                device = "cpu"

            logger.info("Loading PaddleOCR-VL model: %s", settings.PADDLE_OCR_MODEL_ID)
            model = AutoModelForCausalLM.from_pretrained(
                settings.PADDLE_OCR_MODEL_ID,
                trust_remote_code=True,
                dtype=dtype,
                attn_implementation="eager",
                rope_scaling=None,
                revision=getattr(settings, "PADDLE_OCR_MODEL_REVISION", None),
            )
            processor = AutoProcessor.from_pretrained(
                settings.PADDLE_OCR_MODEL_ID,
                trust_remote_code=True,
            )

            self._model = model.eval().to(device)
            self._processor = processor
            self._device = device
            self._loaded = True
            logger.info("PaddleOCR-VL model loaded on %s", device)
        except KeyError as exc:
            if "'default'" in str(exc):
                self._load_error = "Model compatibility issue: RoPE configuration not supported. Try updating transformers or using a different model version."
                logger.exception("Failed to load PaddleOCR-VL model - RoPE config issue")
                raise RuntimeError(self._load_error) from exc
            self._load_error = str(exc)
            logger.exception("Failed to load PaddleOCR-VL model")
            raise RuntimeError(f"Failed to load PaddleOCR-VL model: {exc}") from exc
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
            inputs = self._processor.apply_chat_template(
                messages,
                tokenize=True,
                add_generation_prompt=True,
                return_dict=True,
                return_tensors="pt",
            ).to(self._device)

            outputs = self._model.generate(**inputs, max_new_tokens=tokens)
            return self._processor.batch_decode(outputs, skip_special_tokens=True)[0]

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
