"""
SECra AI - Simple PDF and Photo Query Interface

Public functions:
    ask_pdf(query, pdf_path)
    ask_photo(query, photo_path)

Both functions work with local files and local Ollama.
"""

from pathlib import Path
import re
import requests

from ocr.extraction import DocumentExtractionService
from rag.link_scanner import (
    scan_pdf_links,
    extract_text_urls,
    check_url_risk,
)
from rag.retrieval import EmbeddingService, Reranker, RetrievedChunk


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"


# ---------------------------------------------------------
# Common helpers
# ---------------------------------------------------------

def _validate_query(query):
    if not isinstance(query, str) or not query.strip():
        raise ValueError("Query must be a non-empty string.")


def _validate_file(file_path, allowed_extensions):
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if not path.is_file():
        raise ValueError(f"Path is not a file: {file_path}")

    extension = path.suffix.lower().lstrip(".")

    if extension not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValueError(
            f"Unsupported file type '.{extension}'. "
            f"Allowed: {allowed}"
        )

    return path


def _ask_ollama(question, context):
    prompt = f"""
You are SECra AI.

Answer the user's question using ONLY the information in the
provided context.

Rules:
1. Do not use outside knowledge.
2. Do not guess.
3. Do not invent information.
4. If the answer cannot be found in the context, respond exactly:
   Information not found in provided documents.

Context:
----------------
{context}
----------------

Question:
{question}

Answer:
""".strip()

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        },
        timeout=120,
    )

    response.raise_for_status()

    data = response.json()
    answer = data.get("response", "").strip()

    if not answer:
        answer = "Information not found in provided documents."

    return answer


def _clean_answer(text):
    return text.strip()


# ---------------------------------------------------------
# PDF
# ---------------------------------------------------------

def ask_pdf(query, pdf_path):
    """
    Ask a question about a local PDF.

    Example:
        ask_pdf(
            "What is this document about?",
            "knowledge_base/uploads/MRPL.pdf"
        )
    """

    _validate_query(query)

    pdf = _validate_file(
        pdf_path,
        {"pdf"},
    )

    # Extract normal PDF text + OCR for scanned pages
    extraction_service = DocumentExtractionService()

    extracted = extraction_service.extract(
        str(pdf),
        "pdf",
        original_filename=pdf.name,
    )

    # -----------------------------------------------------
    # Scan PDF links
    # -----------------------------------------------------

    link_results = scan_pdf_links(str(pdf))

    # Also detect URLs appearing directly inside extracted text
    text_urls = extract_text_urls(extracted.full_text)

    text_link_results = []

    for url in text_urls:
        result = check_url_risk(url)
        text_link_results.append(result)

    # Remove duplicate URLs
    all_links = []
    seen_urls = set()

    for item in link_results + text_link_results:
        url = item.get("url")

        if url and url not in seen_urls:
            seen_urls.add(url)
            all_links.append(item)

    # -----------------------------------------------------
    # Build chunks
    # -----------------------------------------------------

    chunks = []

    chunk_size = 900
    overlap = 150

    for page in extracted.pages:

        words = page.text.split()

        if not words:
            continue

        start = 0
        chunk_index = 0

        while start < len(words):

            end = min(
                start + chunk_size,
                len(words),
            )

            chunk_text = " ".join(words[start:end]).strip()

            if chunk_text:
                chunks.append(
                    {
                        "chunk_id": (
                            f"{pdf.name}-"
                            f"{page.page_number}-"
                            f"{chunk_index}"
                        ),
                        "document_id": pdf.name,
                        "filename": pdf.name,
                        "page": page.page_number,
                        "text": chunk_text,
                        "score": 0.0,
                        "department": None,
                        "classification": None,
                        "rerank_score": 0.0,
                        "used_ocr": page.used_ocr,
                    }
                )

            chunk_index += 1

            if end >= len(words):
                break

            start = max(
                end - overlap,
                start + 1,
            )

    # -----------------------------------------------------
    # Retrieval
    # -----------------------------------------------------

    retrieved = []

    if chunks:

        embedding_service = EmbeddingService()

        query_embedding = embedding_service.embed_query(query)

        texts = [chunk["text"] for chunk in chunks]

        document_embeddings = embedding_service.embed_documents(
            texts
        )

        # Embeddings are normalized, therefore dot product
        # gives cosine similarity.
        scores = document_embeddings @ query_embedding

        for index, score in enumerate(scores):

            item = chunks[index].copy()
            item["score"] = float(score)

            retrieved.append(item)

        retrieved.sort(
            key=lambda x: x["score"],
            reverse=True,
        )

        # Keep reasonably relevant chunks.
        retrieved = [
            item
            for item in retrieved
            if item["score"] >= 0.20
        ]

        retrieved = retrieved[:10]

    # -----------------------------------------------------
    # Reranking
    # -----------------------------------------------------

    retrieved_objects = []

    for item in retrieved:

        chunk = RetrievedChunk(
            chunk_id=item["chunk_id"],
            document_id=item["document_id"],
            filename=item["filename"],
            page=item["page"],
            text=item["text"],
            score=item["score"],
            department=item["department"],
            classification=item["classification"],
            rerank_score=item["rerank_score"],
        )

        retrieved_objects.append(chunk)

    if retrieved_objects:

        try:
            reranker = Reranker()

            retrieved_objects = reranker.rerank(
                query,
                retrieved_objects,
            )

        except Exception:
            # If reranker/model is unavailable,
            # semantic retrieval still works.
            pass

    retrieved_objects = retrieved_objects[:5]

    # -----------------------------------------------------
    # Prepare context
    # -----------------------------------------------------

    context_parts = []

    for chunk in retrieved_objects:

        context_parts.append(
            f"[Page {chunk.page}]\n"
            f"{chunk.text}"
        )

    context = "\n\n".join(context_parts)

    if not context:
        context = ""

    # -----------------------------------------------------
    # Ask local Ollama
    # -----------------------------------------------------

    answer = _ask_ollama(
        query,
        context,
    )

    answer = _clean_answer(answer)

    # -----------------------------------------------------
    # Safe source information
    # -----------------------------------------------------

    sources = []

    for chunk in retrieved_objects:

        sources.append(
            {
                "filename": chunk.filename,
                "page": chunk.page,
                "score": round(
                    float(chunk.score),
                    4,
                ),
                "rerank_score": round(
                    float(chunk.rerank_score),
                    4,
                ),
            }
        )

    return {
        "success": True,
        "answer": answer,
        "pdf": pdf.name,
        "pages": extracted.page_count,
        "ocr_pages": sum(
            1
            for page in extracted.pages
            if page.used_ocr
        ),
        "retrieved_chunks": len(retrieved_objects),
        "sources": sources,
        "links_found": all_links,
        "link_count": len(all_links),
        "offline_mode": True,
        "ollama_model": OLLAMA_MODEL,
    }


# ---------------------------------------------------------
# PHOTO
# ---------------------------------------------------------

def ask_photo(query, photo_path):
    """
    Ask a question about text present in a local image.

    Example:
        ask_photo(
            "What is the title of this image?",
            "knowledge_base/uploads/image.jpg"
        )
    """

    _validate_query(query)

    photo = _validate_file(
        photo_path,
        {"png", "jpg", "jpeg", "tiff", "tif"},
    )

    # OCR image
    extraction_service = DocumentExtractionService()

    extracted = extraction_service.extract(
        str(photo),
        photo.suffix.lower().lstrip("."),
        original_filename=photo.name,
    )

    ocr_text = extracted.full_text.strip()

    # -----------------------------------------------------
    # Direct OCR request
    # -----------------------------------------------------

    query_lower = query.lower()

    direct_text_request = any(
        phrase in query_lower
        for phrase in [
            "what text",
            "text present",
            "read the text",
            "extract text",
            "ocr",
        ]
    )

    if direct_text_request:

        answer = (
            ocr_text
            if ocr_text
            else "Information not found in provided documents."
        )

    else:

        context = ocr_text

        if not context:
            context = ""

        answer = _ask_ollama(
            query,
            context,
        )

    answer = _clean_answer(answer)

    return {
        "success": True,
        "answer": answer,
        "photo": photo.name,
        "ocr_text_length": len(ocr_text),
        "ocr_text": ocr_text,
        "sources": [
            {
                "filename": photo.name,
                "type": "image",
                "ocr": True,
            }
        ],
        "offline_mode": True,
        "ocr_engine": "Tesseract",
        "ollama_model": OLLAMA_MODEL,
    }