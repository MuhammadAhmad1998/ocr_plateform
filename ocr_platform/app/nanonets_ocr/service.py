import asyncio
import logging
import time
from threading import Lock

from PIL import Image

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = (
    "Extract the text from the above document as if you were reading it naturally. "
    "Return the tables in html format. Return the equations in LaTeX representation. "
    "If there is an image in the document and image caption is not present, add a small "
    "description of the image inside the <img></img> tag; otherwise, add the image caption "
    "inside <img></img>. Watermarks should be wrapped in brackets. Ex: "
    "<watermark>OFFICIAL COPY</watermark>. Page numbers should be wrapped in brackets. Ex: "
    "<page_number>14</page_number> or <page_number>9/22</page_number>. Prefer using ☐ and ☑ "
    "for check boxes."
)


class NanonetsOCRService:
    def __init__(self) -> None:
        self._model = None
        self._processor = None
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
            from transformers import AutoModelForImageTextToText, AutoProcessor, AutoTokenizer

            device = settings.NANONETS_OCR_DEVICE
            dtype_value = settings.NANONETS_OCR_TORCH_DTYPE
            torch_dtype = (
                "auto"
                if dtype_value == "auto"
                else getattr(torch, dtype_value, torch.bfloat16)
            )

            kwargs: dict = {
                "trust_remote_code": True,
                "torch_dtype": torch_dtype,
            }
            if device == "auto":
                kwargs["device_map"] = "auto"

            attn_implementation = settings.NANONETS_OCR_ATTN_IMPLEMENTATION
            if attn_implementation:
                kwargs["attn_implementation"] = attn_implementation

            logger.info("Loading Nanonets OCR model: %s", settings.NANONETS_OCR_MODEL_ID)
            try:
                model = AutoModelForImageTextToText.from_pretrained(
                    settings.NANONETS_OCR_MODEL_ID,
                    **kwargs,
                )
            except Exception as exc:
                if attn_implementation == "flash_attention_2":
                    logger.warning(
                        "Flash Attention 2 unavailable for Nanonets OCR, retrying with sdpa: %s",
                        exc,
                    )
                    kwargs["attn_implementation"] = "sdpa"
                    model = AutoModelForImageTextToText.from_pretrained(
                        settings.NANONETS_OCR_MODEL_ID,
                        **kwargs,
                    )
                else:
                    raise

            if device != "auto":
                if device == "cuda" and not torch.cuda.is_available():
                    logger.warning("CUDA unavailable, falling back to CPU")
                    device = "cpu"
                model = model.to(device)

            self._model = model.eval()
            self._processor = AutoProcessor.from_pretrained(
                settings.NANONETS_OCR_MODEL_ID,
                trust_remote_code=True,
            )
            self._tokenizer = AutoTokenizer.from_pretrained(
                settings.NANONETS_OCR_MODEL_ID,
                trust_remote_code=True,
            )
            self._loaded = True
            logger.info("Nanonets OCR model loaded")
        except Exception as exc:
            self._load_error = str(exc)
            logger.exception("Failed to load Nanonets OCR model")
            raise RuntimeError(f"Failed to load Nanonets OCR model: {exc}") from exc

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load()

    def _input_device(self):
        if self._model is None:
            return "cpu"
        return getattr(self._model, "device", None) or next(self._model.parameters()).device

    def _run_recognition(
        self,
        image: Image.Image,
        prompt: str,
        max_new_tokens: int | None = None,
    ) -> str:
        self._ensure_loaded()
        settings = get_settings()
        tokens = max_new_tokens or settings.NANONETS_OCR_MAX_NEW_TOKENS

        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt},
                ],
            },
        ]

        text = self._processor.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = self._processor(text=[text], images=[image], padding=True, return_tensors="pt")
        inputs = inputs.to(self._input_device())

        import torch

        with self._inference_lock:
            with torch.no_grad():
                output_ids = self._model.generate(
                    **inputs,
                    max_new_tokens=tokens,
                    do_sample=False,
                )

        generated_ids = [
            output_id[len(input_id) :]
            for input_id, output_id in zip(inputs.input_ids, output_ids)
        ]
        output_text = self._processor.batch_decode(
            generated_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        )
        return output_text[0]

    def recognize_sync(
        self,
        image: Image.Image,
        prompt: str = DEFAULT_PROMPT,
        max_new_tokens: int | None = None,
    ) -> tuple[str, float]:
        start = time.perf_counter()
        result = self._run_recognition(
            image=image,
            prompt=prompt,
            max_new_tokens=max_new_tokens,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

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


nanonets_ocr_service = NanonetsOCRService()
