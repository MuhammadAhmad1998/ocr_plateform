import asyncio
import logging
import time
from threading import Lock
from typing import Any

from PIL import Image

from app.core.config import get_settings
from app.core.model_manager import model_manager

logger = logging.getLogger(__name__)


def _patch_minicpm_remote_code() -> None:
    """MiniCPM-V remote code omits post_init(), which transformers 5.x requires."""
    import transformers.dynamic_module_utils as dmu

    if getattr(dmu, "_minicpm_post_init_patch", False):
        return

    original = dmu.get_class_in_module

    def patched_get_class_in_module(class_name, module_path, *args, **kwargs):
        cls = original(class_name, module_path, *args, **kwargs)
        if class_name == "MiniCPMV":
            original_init = cls.__init__

            def __init__(self, *args, **kwargs):
                original_init(self, *args, **kwargs)
                self.post_init()

            cls.__init__ = __init__
        return cls

    dmu.get_class_in_module = patched_get_class_in_module
    dmu._minicpm_post_init_patch = True


class VLMService:
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
        
        logger.info("Unloading VLM model and clearing GPU memory")
        
        from app.core.model_manager import _strip_accelerate_hooks
        _strip_accelerate_hooks(self._model)

        if self._model is not None:
            del self._model
        if self._tokenizer is not None:
            del self._tokenizer
        self._model = None
        self._tokenizer = None
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
        model_manager.before_load("vlm")

        # Clear GPU memory before loading new model
        self._clear_gpu_memory()

        settings = get_settings()
        try:
            import torch
            from transformers import AutoModel, AutoTokenizer
            from transformers.tokenization_utils_base import PreTrainedTokenizerBase

            # Monkey-patch tokenizer base class to add special token ID attributes
            original_getattr = PreTrainedTokenizerBase.__getattr__
            
            def patched_getattr(self, key):
                # Intercept special token ID requests and provide them from vocab
                if key in ("im_start_id", "im_end_id", "slice_start_id", "slice_end_id"):
                    if not hasattr(self, f"_{key}"):
                        vocab = self.get_vocab()
                        token_map = {
                            "im_start_id": "<image>",
                            "im_end_id": "</image>",
                            "slice_start_id": "<slice>",
                            "slice_end_id": "</slice>",
                        }
                        token_id = vocab.get(token_map[key], -1)
                        setattr(self, f"_{key}", token_id)
                    return getattr(self, f"_{key}")
                return original_getattr(self, key)
            
            PreTrainedTokenizerBase.__getattr__ = patched_getattr

            torch.manual_seed(100)
            dtype = getattr(torch, settings.VLM_TORCH_DTYPE, torch.bfloat16)

            logger.info("Loading VLM model: %s", settings.VLM_MODEL_ID)
            _patch_minicpm_remote_code()
            model = AutoModel.from_pretrained(
                settings.VLM_MODEL_ID,
                trust_remote_code=True,
                attn_implementation=settings.VLM_ATTN_IMPLEMENTATION,
                dtype=dtype,
                low_cpu_mem_usage=False,
            )
            device = settings.VLM_DEVICE
            if device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA unavailable, falling back to CPU")
                device = "cpu"

            self._model = model.eval().to(device)
            self._tokenizer = AutoTokenizer.from_pretrained(
                settings.VLM_MODEL_ID,
                trust_remote_code=True,
            )
            self._loaded = True
            logger.info("VLM model loaded on %s", device)
        except Exception as exc:
            self._load_error = str(exc)
            logger.exception("Failed to load VLM model")
            raise RuntimeError(f"Failed to load VLM model: {exc}") from exc

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load()

    def _run_chat(
        self,
        msgs: list[dict[str, Any]],
        enable_thinking: bool = False,
    ) -> str:
        self._ensure_loaded()

        with self._inference_lock:
            answer = self._model.chat(
                msgs=msgs,
                tokenizer=self._tokenizer,
                enable_thinking=enable_thinking,
                stream=True,
            )

            generated_text = ""
            for chunk in answer:
                generated_text += chunk
            return generated_text

    async def chat_with_image(
        self,
        image: Image.Image,
        question: str,
        enable_thinking: bool = False,
    ) -> tuple[str, float]:
        msgs = [{"role": "user", "content": [image, question]}]
        start = time.perf_counter()
        async with self._async_lock:
            answer = await asyncio.to_thread(
                self._run_chat,
                msgs,
                enable_thinking,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return answer, elapsed_ms

    async def chat_multi_turn(
        self,
        image: Image.Image,
        question: str,
        history: list[dict[str, str]],
        enable_thinking: bool = False,
    ) -> tuple[str, float]:
        msgs: list[dict[str, Any]] = []
        for item in history:
            if item["role"] == "user":
                msgs.append({"role": "user", "content": [item["content"]]})
            else:
                msgs.append({"role": "assistant", "content": [item["content"]]})

        msgs.append({"role": "user", "content": [image, question]})

        start = time.perf_counter()
        async with self._async_lock:
            answer = await asyncio.to_thread(
                self._run_chat,
                msgs,
                enable_thinking,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return answer, elapsed_ms

    async def analyze_pdf_pages(
        self,
        images: list[Image.Image],
        question: str,
        enable_thinking: bool = False,
    ) -> list[tuple[int, str, float]]:
        async def _process_page(page_number: int, image: Image.Image) -> tuple[int, str, float]:
            answer, elapsed_ms = await self.chat_with_image(
                image=image,
                question=question,
                enable_thinking=enable_thinking,
            )
            return page_number, answer, elapsed_ms

        tasks = [
            _process_page(page_number, image)
            for page_number, image in enumerate(images, start=1)
        ]
        return list(await asyncio.gather(*tasks))


vlm_service = VLMService()

# Register with model manager
model_manager.register_service("vlm", vlm_service)
