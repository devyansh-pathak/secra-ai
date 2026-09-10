import os
from dataclasses import dataclass
from typing import List, Optional

from ocr.image_reader import ImageReadError, ImageReader
from ocr.pdf_reader import PDFReadError, PDFReader

from rag.document_processing import DocumentLoadError, DocumentLoader, EmptyDocumentError, UnsupportedFileTypeError

ALLOWED_TEXT_EXTENSIONS = {"pdf", "txt", "docx"}
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "tiff", "tif"}

ALL_SUPPORTED_EXTENSIONS = ALLOWED_TEXT_EXTENSIONS | ALLOWED_IMAGE_EXTENSIONS

class ExtractionError(Exception):
    pass


@dataclass
class ExtractedPage:
    page_number: Optional[int]
    text: str
    used_ocr: bool = False


@dataclass
class ExtractedDocument:
    filename: str
    file_type: str
    pages: List[ExtractedPage]
    requires_ocr: bool  # true if this file type is OCR-first (image) or any page used OCR

    @property
    def full_text(self) -> str:
        return "\n\n".join(page.text for page in self.pages if page.text.strip())

    @property
    def page_count(self) -> Optional[int]:
        return len(self.pages) if self.pages else None


class DocumentExtractionService:
    def __init__(self):
        self._document_loader = DocumentLoader()
        self._pdf_reader = PDFReader()
        self._image_reader = ImageReader()

    def extract(self, file_path: str, file_type: str, original_filename: Optional[str] = None) -> ExtractedDocument:
        extension = file_type.lower()
        if extension not in ALL_SUPPORTED_EXTENSIONS:
            raise ExtractionError(
                f"Unsupported file type '.{extension}'. Supported types: "
                f"{', '.join(sorted(ALL_SUPPORTED_EXTENSIONS))}."
            )

        filename = original_filename or os.path.basename(file_path)

        if extension == "pdf":
            return self._extract_pdf(file_path, filename)
        if extension in ("docx", "txt"):
            return self._extract_text_document(file_path, extension, filename)
        if extension in ALLOWED_IMAGE_EXTENSIONS:
            return self._extract_image(file_path, extension, filename)

        raise ExtractionError(f"No extraction route implemented for '.{extension}'")

    def _extract_pdf(self, file_path: str, filename: str) -> ExtractedDocument:
        try:
            pdf_pages = self._pdf_reader.read(file_path)
        except PDFReadError as exc:
            raise ExtractionError(str(exc)) from exc

        pages = [ExtractedPage(page_number=p.page_number, text=p.text, used_ocr=p.used_ocr) for p in pdf_pages]
        if not any(page.text.strip() for page in pages):
            raise ExtractionError(
                f"No extractable text was found in '{filename}', even after attempting OCR "
                "on pages with insufficient direct text."
            )
        return ExtractedDocument(
            filename=filename, file_type="pdf", pages=pages,
            requires_ocr=any(page.used_ocr for page in pages),
        )

    def _extract_text_document(self, file_path: str, extension: str, filename: str) -> ExtractedDocument:
        try:
            loaded = self._document_loader.load(file_path, file_type=extension)
        except (DocumentLoadError, UnsupportedFileTypeError, EmptyDocumentError) as exc:
            raise ExtractionError(str(exc)) from exc

        pages = [ExtractedPage(page_number=p.page_number, text=p.text, used_ocr=False) for p in loaded.pages]
        return ExtractedDocument(filename=filename, file_type=extension, pages=pages, requires_ocr=False)

    def _extract_image(self, file_path: str, extension: str, filename: str) -> ExtractedDocument:
        try:
            result = self._image_reader.read(file_path, original_filename=filename)
        except ImageReadError as exc:
            raise ExtractionError(str(exc)) from exc

        if not result.text.strip():
            raise ExtractionError(
                f"OCR produced no extractable text for '{filename}'. The image may not "
                "contain readable text, or may be too low quality for OCR."
            )
        return ExtractedDocument(
            filename=filename, file_type=extension,
            pages=[ExtractedPage(page_number=None, text=result.text, used_ocr=True)],
            requires_ocr=True,
        )