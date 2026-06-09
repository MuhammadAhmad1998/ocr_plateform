import asyncio
import io
import logging
import re
import tempfile
import time
from collections import Counter
from pathlib import Path
from threading import Lock

from PIL import Image
from pypdf import PdfReader

from app.core.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_PROMPT = (
    "Extract only the text that is explicitly visible in this document. "
    "Do not add explanations, captions, tags, HTML, Markdown, inferred words, or any content "
    "that is not present in the document. Preserve line breaks where possible."
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

    def extract_pdf_text(self, content: bytes) -> list[str] | None:
        """Prefer the PDF's own text layer when it is present and looks usable."""
        try:
            reader = PdfReader(io.BytesIO(content))
        except Exception:
            return None

        if not reader.pages:
            return None

        pages: list[str] = []
        usable_pages = 0
        for page in reader.pages:
            text = self._normalize_text(page.extract_text() or "")
            pages.append(text)
            if self._is_usable_native_text(text):
                usable_pages += 1

        if usable_pages == len(pages) and usable_pages > 0:
            return pages
        return None

    def _input_device(self):
        if self._model is None:
            return "cpu"
        return getattr(self._model, "device", None) or next(self._model.parameters()).device

    def _normalize_text(self, text: str) -> str:
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _is_usable_native_text(self, text: str) -> bool:
        alnum_count = sum(char.isalnum() for char in text)
        word_count = len(re.findall(r"\b\w+\b", text))
        return alnum_count >= 20 and word_count >= 4

    def _is_usable_image_text(self, text: str) -> bool:
        alnum_count = sum(char.isalnum() for char in text)
        word_count = len(re.findall(r"\b\w+\b", text))
        digit_count = sum(char.isdigit() for char in text)
        return (alnum_count >= 8 and word_count >= 2) or (alnum_count >= 6 and digit_count >= 2)

    def _text_score(self, text: str) -> tuple[int, int]:
        normalized = self._normalize_text(text)
        alnum_count = sum(char.isalnum() for char in normalized)
        word_count = len(re.findall(r"\b\w+\b", normalized))
        return alnum_count, word_count

    def _looks_hallucinated(self, text: str) -> bool:
        normalized = self._normalize_text(text)
        if len(normalized) < 80:
            return False

        tokens = re.findall(r"\S+", normalized)
        if len(tokens) < 12:
            return False

        counts = Counter(token.lower() for token in tokens)
        top_ratio = max(counts.values()) / len(tokens)
        repeated_token_burst = any(count >= 8 for count in counts.values())

        weird_tokens = 0
        for token in tokens:
            if len(token) > 24:
                weird_tokens += 1
                continue

            symbol_count = sum(not char.isalnum() for char in token)
            non_ascii_count = sum(not char.isascii() for char in token)
            ascii_alpha_count = sum(char.isascii() and char.isalpha() for char in token)

            if symbol_count / max(len(token), 1) > 0.35:
                weird_tokens += 1
                continue
            if non_ascii_count and ascii_alpha_count and non_ascii_count / len(token) > 0.25:
                weird_tokens += 1

        weird_ratio = weird_tokens / len(tokens)
        return top_ratio > 0.12 or repeated_token_burst or weird_ratio > 0.18

    def _run_tesseract_fallback(self, image: Image.Image) -> str:
        import pytesseract

        return self._normalize_text(pytesseract.image_to_string(image.convert("RGB")))

    def _extract_image_text(self, image: Image.Image) -> str:
        import pytesseract

        rgb = image.convert("RGB")
        enlarged = rgb.resize((rgb.width * 2, rgb.height * 2))
        grayscale = enlarged.convert("L")
        threshold = grayscale.point(lambda value: 255 if value > 180 else 0)

        candidates = [
            pytesseract.image_to_string(enlarged, config="--psm 6"),
            pytesseract.image_to_string(grayscale, config="--psm 6"),
            pytesseract.image_to_string(threshold, config="--psm 6"),
        ]

        best = ""
        best_score = (-1, -1)
        for candidate in candidates:
            normalized = self._normalize_text(candidate)
            score = self._text_score(normalized)
            if score > best_score:
                best = normalized
                best_score = score

        return best

    def _run_recognition(
        self,
        image: Image.Image,
        prompt: str,
        max_new_tokens: int | None = None,
    ) -> str:
        primary_ocr = ""

        try:
            primary_ocr = self._extract_image_text(image)
        except Exception:
            primary_ocr = ""

        if self._is_usable_image_text(primary_ocr) and not self._looks_hallucinated(primary_ocr):
            return primary_ocr

        self._ensure_loaded()
        settings = get_settings()
        tokens = max_new_tokens or settings.NANONETS_OCR_MAX_NEW_TOKENS

        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
        ]
        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                temp_path = Path(temp_file.name)

            image.convert("RGB").save(temp_path)
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": temp_path.as_uri()},
                        {"type": "text", "text": prompt},
                    ],
                }
            )

            chat_text = self._processor.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
            inputs = self._processor(
                text=[chat_text],
                images=[image.convert("RGB")],
                padding=True,
                return_tensors="pt",
            )
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
                output_token_ids[len(input_token_ids) :]
                for input_token_ids, output_token_ids in zip(inputs.input_ids, output_ids)
            ]
            output_text = self._processor.batch_decode(
                generated_ids,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=True,
            )
            normalized = self._normalize_text(output_text[0])

            if primary_ocr and self._is_usable_image_text(primary_ocr) and not self._looks_hallucinated(primary_ocr):
                logger.warning("Using primary OCR result because it looked more reliable than model output")
                return primary_ocr

            if not normalized or self._looks_hallucinated(normalized):
                try:
                    fallback = primary_ocr or self._run_tesseract_fallback(image)
                except Exception:
                    fallback = ""
                if fallback and (not normalized or self._looks_hallucinated(normalized)):
                    logger.warning("Nanonets OCR output looked unreliable, using Tesseract fallback")
                    return fallback

            return normalized
        finally:
            if temp_path and temp_path.exists():
                temp_path.unlink()

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
