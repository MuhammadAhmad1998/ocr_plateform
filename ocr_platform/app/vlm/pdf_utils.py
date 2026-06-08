from io import BytesIO

import fitz
from PIL import Image


def pdf_bytes_to_images(content: bytes, dpi: int = 144) -> list[Image.Image]:
    """Render each PDF page to a PIL RGB image."""
    doc = fitz.open(stream=content, filetype="pdf")
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    images: list[Image.Image] = []

    try:
        for page in doc:
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            images.append(image)
    finally:
        doc.close()

    return images


def image_bytes_to_pil(content: bytes) -> Image.Image:
    return Image.open(BytesIO(content)).convert("RGB")
