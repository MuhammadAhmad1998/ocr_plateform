import asyncio
import logging
import time
from threading import Lock
from typing import Any

from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class VLMService:
    def __init__(self) -> None:
        self._model = None
        self._tokenizer = None
        self._loaded = False
        self._load_error: str | None = None
        self._inference_lock = Lock()
        self._async_lock = asyncio.Lock()

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def load(self) -> None:
        if self._loaded:
            return
        if self._load_error:
            raise RuntimeError(self._load_error)

        settings = get_settings()
        try:
            import torch
            from transformers import AutoModel, AutoTokenizer

            torch.manual_seed(100)
            dtype = getattr(torch, settings.VLM_TORCH_DTYPE, torch.bfloat16)

            logger.info("Loading VLM model: %s", settings.VLM_MODEL_ID)
            model = AutoModel.from_pretrained(
                settings.VLM_MODEL_ID,
                trust_remote_code=True,
                attn_implementation=settings.VLM_ATTN_IMPLEMENTATION,
                torch_dtype=dtype,
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
