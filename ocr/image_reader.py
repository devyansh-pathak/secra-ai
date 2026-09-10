import os
from dataclasses import dataclass
from typing import Optional

MAX_IMAGE_PIXELS = 40_000_000  # ~40 megapixels; guards against decompression-bomb style uploads
MIN_DIMENSION = 10

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "tiff", "tif"}

# Magic-byte signatures used for extension-spoofing checks (see extractor.py / ingestion.py)
IMAGE_SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": "png",
    b"\xff\xd8\xff": "jpg",
    b"II*\x00": "tiff",
    b"MM\x00*": "tiff",
}


class ImageReadError(Exception):
    pass


class OCREngineUnavailableError(Exception):
    """Raised when pytesseract/Tesseract is not installed or not on PATH."""


@dataclass
class OCRResult:
    text: str
    filename: str
    file_type: str
    width: int
    height: int
    engine: str


def _get_pytesseract():
    try:
        import pytesseract
    except ImportError as exc:
        raise OCREngineUnavailableError(
            "pytesseract is not installed. Run 'pip install -r requirements.txt'."
        ) from exc

    tesseract_cmd = os.getenv("TESSERACT_CMD")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    try:
        pytesseract.get_tesseract_version()
    except Exception as exc:
        raise OCREngineUnavailableError(
            "The Tesseract OCR binary is not available on this system. It "
            "must be installed separately from the pytesseract Python "
            "package (see README 'OCR system dependency' section)."
        ) from exc

    return pytesseract


class ImageReader:
    def read(self, file_path: str, original_filename: Optional[str] = None) -> OCRResult:
        if not os.path.isfile(file_path):
            raise ImageReadError(f"File not found: {file_path}")

        try:
            from PIL import Image, UnidentifiedImageError
        except ImportError as exc:
            raise ImageReadError("Pillow is not installed. Run 'pip install -r requirements.txt'.") from exc

        try:
            with Image.open(file_path) as image:
                image.verify()  # cheap structural validation; re-open below since verify() invalidates the handle
        except (UnidentifiedImageError, OSError) as exc:
            raise ImageReadError(f"Corrupted or unreadable image: {exc}") from exc

        try:
            with Image.open(file_path) as image:
                width, height = image.size
                if width < MIN_DIMENSION or height < MIN_DIMENSION:
                    raise ImageReadError(f"Image dimensions too small to be a real document: {width}x{height}")
                if width * height > MAX_IMAGE_PIXELS:
                    raise ImageReadError(
                        f"Image exceeds the maximum allowed pixel count ({MAX_IMAGE_PIXELS})."
                    )
                if image.mode not in ("RGB", "L"):
                    image = image.convert("RGB")

                pytesseract = _get_pytesseract()
                try:
                    text = pytesseract.image_to_string(image)
                except Exception as exc:
                    raise ImageReadError(f"OCR extraction failed: {exc}") from exc
        except ImageReadError:
            raise
        except Exception as exc:
            raise ImageReadError(f"Failed to process image: {exc}") from exc

        filename = original_filename or os.path.basename(file_path)
        extension = os.path.splitext(filename)[1].lstrip(".").lower() or "png"

        return OCRResult(
            text=text, filename=filename, file_type=extension,
            width=width, height=height, engine="tesseract",
        )