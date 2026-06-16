import asyncio
import logging
import tempfile
import time
from pathlib import Path
from threading import Lock
from typing import Literal

from PIL import Image

from app.core.config import get_settings
from app.core.model_manager import model_manager

logger = logging.getLogger(__name__)

GotOCRType = Literal["ocr", "format"]


def _patch_got_ocr_remote_code() -> None:
    """
    GOT-OCR2.0's remote code has three incompatibilities with transformers 5.x:

    1. `prepare_inputs_for_generation` uses `past_key_values.seen_tokens`, which
       was replaced by `get_seq_length()` in DynamicCache.

    2. `prepare_inputs_for_generation` uses `past_key_values.get_max_length()`,
       which was replaced by the `max_cache_len` property.

    3. `chat()` passes `images=[...]` to `self.generate()`, but transformers 5.8+
       strictly validates kwargs via `_validate_model_kwargs` and fails to detect
       `images` in the remote-loaded forward() signature.

    This monkey-patch wraps the class to transparently fix all three issues.
    """
    import transformers.dynamic_module_utils as dmu

    if getattr(dmu, "_got_ocr_seen_tokens_patch", False):
        return

    original = dmu.get_class_in_module

    def patched_get_class_in_module(class_name, module_path, *args, **kwargs):
        cls = original(class_name, module_path, *args, **kwargs)

        if class_name == "GOTQwenForCausalLM":
            # Patch 1: fix seen_tokens -> get_seq_length()
            if hasattr(cls, "prepare_inputs_for_generation"):
                original_prepare = cls.prepare_inputs_for_generation

                def prepare_inputs_for_generation(
                    self, input_ids, past_key_values=None, attention_mask=None, inputs_embeds=None, **kw
                ):
                    if past_key_values is not None:
                        # seen_tokens was removed in transformers 5.x, replaced by get_seq_length()
                        if not hasattr(past_key_values, "seen_tokens"):
                            if hasattr(past_key_values, "get_seq_length"):
                                past_key_values.seen_tokens = past_key_values.get_seq_length()
                        # get_max_length() was removed in transformers 5.x, replaced by max_cache_len property
                        if not hasattr(past_key_values, "get_max_length"):
                            max_len = getattr(past_key_values, "max_cache_len", None)
                            if max_len is None and hasattr(past_key_values, "get_seq_length"):
                                max_len = past_key_values.get_seq_length()
                            past_key_values.get_max_length = lambda: max_len

                    return original_prepare(
                        self,
                        input_ids,
                        past_key_values=past_key_values,
                        attention_mask=attention_mask,
                        inputs_embeds=inputs_embeds,
                        **kw,
                    )

                cls.prepare_inputs_for_generation = prepare_inputs_for_generation

            # Patch 2: allow 'images' kwarg in generate() validation
            if hasattr(cls, "generate"):
                original_generate = cls.generate

                def generate(self, *args, **kwargs):
                    # transformers 5.8+ _validate_model_kwargs fails to see 'images'
                    # in the remote-loaded forward() signature. Pop it before
                    # validation and re-inject it after.
                    images = kwargs.pop("images", None)

                    # Also patch _validate_model_kwargs to not reject 'images'
                    original_validate = self._validate_model_kwargs

                    def patched_validate(model_kwargs):
                        # Remove 'images' from the copy so validation passes
                        cleaned = {k: v for k, v in model_kwargs.items() if k != "images"}
                        original_validate(cleaned)

                    self._validate_model_kwargs = patched_validate
                    try:
                        if images is not None:
                            kwargs["images"] = images
                        return original_generate(self, *args, **kwargs)
                    finally:
                        self._validate_model_kwargs = original_validate

                cls.generate = generate

        return cls

    dmu.get_class_in_module = patched_get_class_in_module
    dmu._got_ocr_seen_tokens_patch = True


class GotOCRService:
    def __init__(self) -> None:
        self._model = None
        self._tokenizer = None
        self._loaded = False
        self._load_error: str | None = None
        self._inference_lock = Lock()
        self._async_lock = asyncio.Lock()

    def unload(self) -> None:
        """Explicitly unload the model and free GPU memory."""
        if not self._loaded:
            return

        logger.info("Unloading GOT-OCR model and clearing GPU memory")

        # Strip accelerate dispatch hooks BEFORE deleting — these keep GPU refs alive
        from app.core.model_manager import _strip_accelerate_hooks
        _strip_accelerate_hooks(self._model)

        # Explicitly delete model and tokenizer to break all references
        if self._model is not None:
            del self._model
        if self._tokenizer is not None:
            del self._tokenizer
        self._model = None
        self._tokenizer = None
        self._loaded = False
        self._load_error = None

        # Aggressive GC + CUDA cleanup
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
        model_manager.before_load("got_ocr")

        self._clear_gpu_memory()

        # Log memory state before loading
        try:
            import torch
            if torch.cuda.is_available():
                logger.info(
                    "Pre-load GPU state: allocated=%.2f GB, reserved=%.2f GB, free=%.2f GB",
                    torch.cuda.memory_allocated() / (1024**3),
                    torch.cuda.memory_reserved() / (1024**3),
                    (torch.cuda.get_device_properties(0).total_mem - torch.cuda.memory_reserved()) / (1024**3),
                )
        except Exception:
            pass

        settings = get_settings()
        try:
            import torch
            from transformers import AutoModel, AutoTokenizer

            # GOT-OCR's remote code uses .half() internally for the image encoder.
            # Loading in float16 avoids a dtype mismatch (fp16 image vs bf16 weights)
            # that triggers errors during the forward pass.
            model_dtype = torch.float16

            logger.info("Loading GOT-OCR model: %s", settings.GOT_OCR_MODEL_ID)

            _patch_got_ocr_remote_code()

            tokenizer = AutoTokenizer.from_pretrained(
                settings.GOT_OCR_MODEL_ID,
                trust_remote_code=True,
            )

            device = settings.GOT_OCR_DEVICE
            if device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA unavailable, falling back to CPU")
                device = "cpu"

            # Load directly to target device to avoid CPU→GPU memory doubling.
            # device_map places weights on the target device immediately.
            load_kwargs: dict = dict(
                trust_remote_code=True,
                low_cpu_mem_usage=True,
                use_safetensors=True,
                pad_token_id=tokenizer.eos_token_id,
                dtype=model_dtype,
            )
            if device in ("cuda", "auto") and torch.cuda.is_available():
                load_kwargs["device_map"] = "cuda:0"
            
            model = AutoModel.from_pretrained(
                settings.GOT_OCR_MODEL_ID,
                **load_kwargs,
            )

            # Only call .to(device) if not already placed via device_map
            if "device_map" not in load_kwargs:
                model = model.eval().to(device)
            else:
                model.eval()

            # Log memory usage after loading
            if device in ("cuda", "auto") and torch.cuda.is_available():
                logger.info(
                    "GOT-OCR loaded. GPU allocated: %.2f GB, reserved: %.2f GB",
                    torch.cuda.memory_allocated() / (1024**3),
                    torch.cuda.memory_reserved() / (1024**3),
                )

            self._model = model
            self._tokenizer = tokenizer
            self._loaded = True
            logger.info("GOT-OCR model loaded on %s", device)
        except Exception as exc:
            self._load_error = str(exc)
            logger.exception("Failed to load GOT-OCR model")
            raise RuntimeError(f"Failed to load GOT-OCR model: {exc}") from exc

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load()

    def _run_recognition(
        self,
        image: Image.Image,
        ocr_type: str = "ocr",
    ) -> str:
        self._ensure_loaded()

        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                temp_path = Path(temp_file.name)

            image.convert("RGB").save(temp_path)

            with self._inference_lock:
                import torch
                with torch.inference_mode():
                    result = self._model.chat(
                        self._tokenizer,
                        str(temp_path),
                        ocr_type=ocr_type,
                    )

            # Handle both string and generator/stream returns
            if isinstance(result, str):
                return result
            elif hasattr(result, "__iter__") and not isinstance(result, (str, bytes)):
                return "".join(str(chunk) for chunk in result)
            else:
                return str(result)
        except Exception:
            logger.exception("GOT-OCR model.chat() failed")
            raise
        finally:
            if temp_path and temp_path.exists():
                temp_path.unlink()

    async def recognize(
        self,
        image: Image.Image,
        ocr_type: str = "ocr",
    ) -> tuple[str, float]:
        start = time.perf_counter()
        async with self._async_lock:
            result = await asyncio.to_thread(
                self._run_recognition,
                image,
                ocr_type,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

    async def analyze_pdf_pages(
        self,
        images: list[Image.Image],
        ocr_type: str = "ocr",
    ) -> list[tuple[int, str, float]]:
        async def _process_page(page_number: int, image: Image.Image) -> tuple[int, str, float]:
            result, elapsed_ms = await self.recognize(
                image=image,
                ocr_type=ocr_type,
            )
            return page_number, result, elapsed_ms

        tasks = [
            _process_page(page_number, image)
            for page_number, image in enumerate(images, start=1)
        ]
        return list(await asyncio.gather(*tasks))


got_ocr_service = GotOCRService()

# Register with model manager
model_manager.register_service("got_ocr", got_ocr_service)
