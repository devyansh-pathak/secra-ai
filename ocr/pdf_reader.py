import os
from dataclasses import dataclass
from typing import List, Optional

from ocr.image_reader import OCREngineUnavailableError, _get_pytesseract
from rag.ingestion import get_logger

logger = get_logger(__name__, "application")

MIN_TEXT_CHARS_PER_PAGE = 20  # below this, treat the page as needing OCR
OCR_RENDER_DPI = 200


class PDFReadError(Exception):
    pass


@dataclass
class PDFPageResult:
    page_number: int
    text: str
    used_ocr: bool


class PDFReader:
    def read(self, file_path: str) -> List[PDFPageResult]:
        if not os.path.isfile(file_path):
            raise PDFReadError(f"File not found: {file_path}")

        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise PDFReadError("pypdf is not installed. Run 'pip install -r requirements.txt'.") from exc

        try:
            reader = PdfReader(file_path)
        except Exception as exc:
            raise PDFReadError(f"Failed to open PDF: {exc}") from exc

        if reader.is_encrypted:
            raise PDFReadError("PDF is password-protected and cannot be processed.")

        results: List[PDFPageResult] = []
        pages_needing_ocr: List[int] = []

        for index, page in enumerate(reader.pages, start=1):
            try:
                text = (page.extract_text() or "").strip()
            except Exception as exc:
                raise PDFReadError(f"Failed to extract text from page {index}: {exc}") from exc

            if len(text) >= MIN_TEXT_CHARS_PER_PAGE:
                results.append(PDFPageResult(page_number=index, text=text, used_ocr=False))
            else:
                results.append(PDFPageResult(page_number=index, text="", used_ocr=False))
                pages_needing_ocr.append(index)

        if pages_needing_ocr:
            ocr_results = self._ocr_pages(file_path, pages_needing_ocr)
            by_page = {r.page_number: r for r in results}
            for page_number, ocr_text in ocr_results.items():
                by_page[page_number] = PDFPageResult(page_number=page_number, text=ocr_text, used_ocr=True)
            results = [by_page[i] for i in sorted(by_page.keys())]

        return results

    def _ocr_pages(self, file_path: str, page_numbers: List[int]) -> dict:
        try:
            import fitz  # PyMuPDF
        except ImportError as exc:
            logger.warning(
                "PyMuPDF not installed; %d scanned page(s) will be indexed with empty "
                "text instead of OCR. Run 'pip install -r requirements.txt' to enable "
                "scanned-PDF OCR.", len(page_numbers),
            )
            return {}

        try:
            pytesseract = _get_pytesseract()
        except OCREngineUnavailableError as exc:
            logger.warning(
                "Tesseract unavailable; %d scanned page(s) will be indexed with empty "
                "text: %s", len(page_numbers), exc,
            )
            return {}

        from PIL import Image
        import io

        results = {}
        try:
            doc = fitz.open(file_path)
            zoom = OCR_RENDER_DPI / 72
            matrix = fitz.Matrix(zoom, zoom)
            for page_number in page_numbers:
                fitz_page = doc[page_number - 1]
                pixmap = fitz_page.get_pixmap(matrix=matrix)
                image = Image.open(io.BytesIO(pixmap.tobytes("png")))
                try:
                    text = pytesseract.image_to_string(image)
                except Exception as exc:
                    logger.warning("OCR failed for PDF page %d: %s", page_number, exc)
                    text = ""
                results[page_number] = text
            doc.close()
        except Exception as exc:
            logger.warning("Failed to render PDF pages for OCR: %s", exc)
            return {}

        return results