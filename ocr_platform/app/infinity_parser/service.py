import asyncio
import logging
import time
from threading import Lock
from typing import Literal

from PIL import Image

from app.core.config import get_settings
from app.core.model_manager import model_manager

logger = logging.getLogger(__name__)

InfinityTask = Literal["doc2md", "doc2json", "custom"]

DOC2MD_PROMPT = (
    "Please transform the document's contents into Markdown format."
)

DOC2JSON_PROMPT = """
- Extract layout information from the provided PDF image.
- For each layout element, output its bbox, category, and the text content within the bbox.
- Bbox format: [x1, y1, x2, y2].
- Allowed layout categories: ['header', 'title', 'text', 'figure', 'table', 'formula', 'figure_caption', 'table_caption', 'formula_caption', 'figure_footnote', 'table_footnote', 'page_footnote', 'footer'].
- Text extraction and formatting:
  1) For 'figure', the text field must be an empty string.
  2) For 'formula', format text as LaTeX.
  3) For 'table', format text as HTML.
  4) For all other categories (e.g., text, title), format text as Markdown.
- The output text must be exactly the original text from the image, with no translation or rewriting.
- Sort all layout elements in human reading order.
- Final output must be a single JSON object.
""".strip()

TASK_PROMPTS: dict[str, str] = {
    "doc2md": DOC2MD_PROMPT,
    "doc2json": DOC2JSON_PROMPT,
}


class InfinityParserService:
    def __init__(self) -> None:
        self._model = None
        self._processor = None
        self._device: str | None = None
        self._loaded = False
        self._load_error: str | None = None
        self._inference_lock = Lock()
        self._async_lock = asyncio.Lock()

    def unload(self) -> None:
        if not self._loaded:
            return

        logger.info("Unloading Infinity-Parser2 model and clearing GPU memory")

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

        model_manager.before_load("infinity_parser")
        self._clear_gpu_memory()

        settings = get_settings()
        try:
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor

            dtype = getattr(torch, settings.INFINITY_PARSER_TORCH_DTYPE, torch.bfloat16)
            device = settings.INFINITY_PARSER_DEVICE
            use_device_map = device == "auto"

            if not use_device_map and device == "cuda" and not torch.cuda.is_available():
                logger.warning("CUDA unavailable, falling back to CPU")
                device = "cpu"

            logger.info("Loading Infinity-Parser2 model: %s", settings.INFINITY_PARSER_MODEL_ID)

            load_kwargs: dict = {
                "dtype": dtype,
                "trust_remote_code": True,
            }
            if use_device_map:
                load_kwargs["device_map"] = "auto"

            model = AutoModelForImageTextToText.from_pretrained(
                settings.INFINITY_PARSER_MODEL_ID,
                **load_kwargs,
            )
            if not use_device_map:
                model = model.to(device)
                self._device = device
            else:
                self._device = None

            processor = AutoProcessor.from_pretrained(
                settings.INFINITY_PARSER_MODEL_ID,
                trust_remote_code=True,
            )

            self._model = model.eval()
            self._processor = processor
            self._loaded = True
            logger.info("Infinity-Parser2 model loaded")
        except Exception as exc:
            self._load_error = str(exc)
            logger.exception("Failed to load Infinity-Parser2 model")
            raise RuntimeError(f"Failed to load Infinity-Parser2 model: {exc}") from exc

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load()

    def _input_device(self):
        if self._device is None:
            return self._model.device
        return self._device

    @staticmethod
    def _resolve_prompt(task_type: str, custom_prompt: str | None) -> str:
        if task_type == "custom":
            if not custom_prompt:
                raise ValueError("custom_prompt is required when task_type is 'custom'")
            return custom_prompt
        if task_type not in TASK_PROMPTS:
            raise ValueError(
                f"Invalid task_type '{task_type}'. Must be one of: {', '.join(TASK_PROMPTS)}, custom"
            )
        return TASK_PROMPTS[task_type]

    def _run_recognition(
        self,
        image: Image.Image,
        task_type: str = "doc2md",
        custom_prompt: str | None = None,
        max_new_tokens: int | None = None,
        enable_thinking: bool = False,
    ) -> str:
        self._ensure_loaded()
        settings = get_settings()
        tokens = max_new_tokens or settings.INFINITY_PARSER_MAX_NEW_TOKENS
        prompt = self._resolve_prompt(task_type, custom_prompt)
        image = image.convert("RGB")

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "image": image,
                        "min_pixels": settings.INFINITY_PARSER_MIN_PIXELS,
                        "max_pixels": settings.INFINITY_PARSER_MAX_PIXELS,
                    },
                    {"type": "text", "text": prompt},
                ],
            },
        ]

        with self._inference_lock:
            try:
                from qwen_vl_utils import process_vision_info
            except ImportError as exc:
                raise RuntimeError(
                    "qwen-vl-utils is required for Infinity-Parser2. "
                    "Install with: pip install qwen-vl-utils"
                ) from exc

            import torch

            processor = self._processor
            chat_template_kwargs = {"enable_thinking": enable_thinking}
            text = processor.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
                **chat_template_kwargs,
            )
            image_inputs, _ = process_vision_info(messages, image_patch_size=16)

            inputs = processor(
                text=text,
                images=image_inputs,
                do_resize=False,
                padding=True,
                return_tensors="pt",
            )
            device = self._input_device()
            inputs = {
                key: value.to(device) if isinstance(value, torch.Tensor) else value
                for key, value in inputs.items()
            }

            with torch.no_grad():
                generated_ids = self._model.generate(
                    **inputs,
                    max_new_tokens=tokens,
                    temperature=0.0,
                    top_p=1.0,
                )

            generated_ids_trimmed = [
                out_ids[len(in_ids) :]
                for in_ids, out_ids in zip(inputs["input_ids"], generated_ids)
            ]
            output = processor.batch_decode(
                generated_ids_trimmed,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )
            return output[0] if output else ""

    async def recognize(
        self,
        image: Image.Image,
        task_type: str = "doc2md",
        custom_prompt: str | None = None,
        max_new_tokens: int | None = None,
        enable_thinking: bool = False,
    ) -> tuple[str, float]:
        start = time.perf_counter()
        async with self._async_lock:
            result = await asyncio.to_thread(
                self._run_recognition,
                image,
                task_type,
                custom_prompt,
                max_new_tokens,
                enable_thinking,
            )
        elapsed_ms = (time.perf_counter() - start) * 1000
        return result, elapsed_ms

    async def analyze_pdf_pages(
        self,
        images: list[Image.Image],
        task_type: str = "doc2md",
        custom_prompt: str | None = None,
        max_new_tokens: int | None = None,
        enable_thinking: bool = False,
    ) -> list[tuple[int, str, float]]:
        async def _process_page(page_number: int, page_image: Image.Image) -> tuple[int, str, float]:
            result, elapsed_ms = await self.recognize(
                image=page_image,
                task_type=task_type,
                custom_prompt=custom_prompt,
                max_new_tokens=max_new_tokens,
                enable_thinking=enable_thinking,
            )
            return page_number, result, elapsed_ms

        tasks = [
            _process_page(page_number, page_image)
            for page_number, page_image in enumerate(images, start=1)
        ]
        return list(await asyncio.gather(*tasks))


infinity_parser_service = InfinityParserService()

model_manager.register_service("infinity_parser", infinity_parser_service)
