import asyncio
import logging
import time
from threading import Lock

from PIL import Image

from app.core.config import get_settings
from app.core.model_manager import model_manager

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = "Parse this document to Markdown."


class QianfanOCRService:
    def __init__(self) -> None:
        self._model = None
        self._processor = None
        self._device: str | None = None
        self._loaded = False
        self._load_error: str | None = None
        self._inference_lock = Lock()
        self._async_lock = asyncio.Lock()

    def unload(self) -> None:
        """Explicitly unload the model and free GPU memory."""
        if not self._loaded:
            return
        
        logger.info("Unloading Qianfan-OCR model and clearing GPU memory")
        
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
        model_manager.before_load("qianfan_ocr")

        # Clear GPU memory before loading new model
        self._clear_gpu_memory()

        settings = get_settings()
        try:
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor

            dtype = getattr(torch, settings.QIANFAN_OCR_TORCH_DTYPE, torch.bfloat16)
            device = settings.QIANFAN_OCR_DEVICE
            use_device_map = device == "auto"

            if not use_device_map and device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA unavailable, falling back to CPU")
                device = "cpu"

            logger.info("Loading Qianfan-OCR model: %s", settings.QIANFAN_OCR_MODEL_ID)

            if use_device_map:
                model = AutoModelForImageTextToText.from_pretrained(
                    settings.QIANFAN_OCR_MODEL_ID,
                    dtype=dtype,
                    device_map="auto",
                    trust_remote_code=True,
                )
                self._device = None
            else:
                model = AutoModelForImageTextToText.from_pretrained(
                    settings.QIANFAN_OCR_MODEL_ID,
                    dtype=dtype,
                    trust_remote_code=True,
                )
                model = model.to(device)
                self._device = device

            processor = AutoProcessor.from_pretrained(
                settings.QIANFAN_OCR_MODEL_ID,
                trust_remote_code=True,
            )

            self._model = model.eval()
            self._processor = processor
            self._loaded = True
            logger.info("Qianfan-OCR model loaded")
        except Exception as exc:
            self._load_error = str(exc)
            logger.exception("Failed to load Qianfan-OCR model")
            raise RuntimeError(f"Failed to load Qianfan-OCR model: {exc}") from exc

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load()

    def _input_device(self):
        if self._device is None:
            return self._model.device
        return self._device

    def _run_recognition(
        self,
        image: Image.Image,
        prompt: str,
        max_new_tokens: int | None = None,
    ) -> str:
        self._ensure_loaded()
        settings = get_settings()
        tokens = max_new_tokens or settings.QIANFAN_OCR_MAX_NEW_TOKENS

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt},
                ],
            },
        ]

        with self._inference_lock:
            inputs = self._processor.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
            ).to(self._input_device())

            import torch

            with torch.no_grad():
                output_ids = self._model.generate(
                    **inputs,
                    max_new_tokens=tokens,
                    do_sample=False,
                )

            generated_ids = output_ids[:, inputs["input_ids"].shape[1] :]
            return self._processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

    async def recognize(
        self,
        image: Image.Image,
        prompt: str = DEFAULT_PROMPT,
        max_new_tokens: int | None = None,
    ) -> tuple[str, float]:
        start = time.perf_counter()
        async with self._async_lock:
            result = await asyncio.to_thread(
                self._run_recognition,
                image,
                prompt,
                max_new_tokens,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

    async def analyze_pdf_pages(
        self,
        images: list[Image.Image],
        prompt: str = DEFAULT_PROMPT,
        max_new_tokens: int | None = None,
    ) -> list[tuple[int, str, float]]:
        async def _process_page(page_number: int, image: Image.Image) -> tuple[int, str, float]:
            result, elapsed_ms = await self.recognize(
                image=image,
                prompt=prompt,
                max_new_tokens=max_new_tokens,
            )
            return page_number, result, elapsed_ms

        tasks = [
            _process_page(page_number, image)
            for page_number, image in enumerate(images, start=1)
        ]
        return list(await asyncio.gather(*tasks))


qianfan_ocr_service = QianfanOCRService()

# Register with model manager
model_manager.register_service("qianfan_ocr", qianfan_ocr_service)
