"""Map unified OCR output formats to model-specific inference parameters."""

from typing import Literal

OutputFormat = Literal["plain_text", "markdown", "json", "html", "formatted"]

DEFAULT_VLM_QUESTION = (
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
)

VLM_PROMPTS: dict[str, str] = {
    "plain_text": "Extract all text from this document. Return only the extracted text with no commentary.",
    "markdown": (
        "Convert this document to clean Markdown format. Preserve headings, lists, tables, and reading order."
    ),
    "json": (
        "Extract layout elements from this document as a single JSON object. "
        "Include bounding boxes, element categories, and text content for each block."
    ),
    "html": (
        "Convert this document to semantic HTML. Represent tables with HTML table markup "
        "and preserve document structure."
    ),
    "formatted": (
        "Extract all text from this document, preserving layout, reading order, and structure."
    ),
}

QIANFAN_PROMPTS: dict[str, str] = {
    "plain_text": "Extract all text as plain text with no formatting or translation.",
    "markdown": "Parse this document to Markdown.",
    "json": (
        "Extract structured layout information as JSON with element categories, "
        "bounding boxes, and text content."
    ),
    "html": "Extract document content as HTML. Format tables using HTML table markup.",
    "formatted": "Parse this document preserving layout, structure, and reading order.",
}

PADDLE_TASKS: dict[str, str] = {
    "plain_text": "ocr",
    "markdown": "ocr",
    "json": "spotting",
    "html": "table",
    "formatted": "ocr",
}

GOT_OCR_TYPES: dict[str, str] = {
    "plain_text": "ocr",
    "markdown": "format",
    "json": "format",
    "html": "format",
    "formatted": "format",
}

INFINITY_TASKS: dict[str, str] = {
    "plain_text": "custom",
    "markdown": "doc2md",
    "json": "doc2json",
    "html": "doc2json",
    "formatted": "doc2md",
}

INFINITY_CUSTOM_PROMPTS: dict[str, str] = {
    "plain_text": "Extract all text as plain text with no formatting or translation.",
}


def normalize_output_format(output_format: str | None) -> str:
    allowed = {"plain_text", "markdown", "json", "html", "formatted"}
    if output_format and output_format in allowed:
        return output_format
    return "markdown"


def resolve_testing_params(
    model_slug: str,
    *,
    output_format: str | None = "markdown",
    question: str = "",
    prompt: str = "",
    task: str = "ocr",
    ocr_type: str = "",
) -> dict:
    """Return kwargs for the model-specific testing runner."""
    fmt = normalize_output_format(output_format)
    custom = prompt.strip() if prompt else ""

    if model_slug == "vlm":
        return {
            "question": custom or question or VLM_PROMPTS.get(fmt, VLM_PROMPTS["markdown"]),
            "output_format": fmt,
        }

    if model_slug == "paddle-ocr-vl":
        return {
            "task": PADDLE_TASKS.get(fmt, task or "ocr"),
            "output_format": fmt,
        }

    if model_slug == "qianfan-ocr":
        return {
            "prompt": custom or QIANFAN_PROMPTS.get(fmt, QIANFAN_PROMPTS["markdown"]),
            "output_format": fmt,
        }

    if model_slug == "got-ocr2":
        return {
            "ocr_type": ocr_type or GOT_OCR_TYPES.get(fmt, "ocr"),
            "output_format": fmt,
        }

    if model_slug == "infinity-parser2-flash":
        task_type = INFINITY_TASKS.get(fmt, "doc2md")
        custom_prompt = None
        if custom:
            task_type = "custom"
            custom_prompt = custom
        elif task_type == "custom":
            custom_prompt = INFINITY_CUSTOM_PROMPTS.get(fmt, INFINITY_CUSTOM_PROMPTS["plain_text"])
        return {
            "task_type": task_type,
            "custom_prompt": custom_prompt,
            "output_format": fmt,
        }

    return {"output_format": fmt}
