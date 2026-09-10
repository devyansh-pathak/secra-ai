"""
Document ingestion service.

Pipeline:

    validate
        ↓
    checksum
        ↓
    duplicate check
        ↓
    secure file storage
        ↓
    document loading
        ↓
    text cleaning
        ↓
    chunking
        ↓
    embedding generation
        ↓
    FAISS vector persistence
        ↓
    database chunk metadata
        ↓
    mark document indexed

On failure:
    - document is marked failed
    - database chunks are removed
    - vectors are removed
    - original uploaded file remains available for diagnosis/reindexing
"""

import hashlib
import os
import uuid
import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime
from typing import List, Optional
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)

from sqlalchemy.orm import relationship
from sqlalchemy.orm import Session, declarative_base
Base = declarative_base() 

def generate_uuid() -> str:
    return str(uuid.uuid4())

from database import Document, DocumentChunk

from rag.document_processing import (
    Chunker,
    DocumentLoadError,
    DocumentLoader,
    EmptyDocumentError,
    UnsupportedFileTypeError,
    clean_text,
    generate_chunk_id,
)
ALLOWED_DOCUMENT_EXTENSIONS = {"pdf", "txt", "docx"}
CLASSIFICATION_LEVELS = ["public", "internal", "confidential", "restricted"]

from rag.retrieval import (
    EmbeddingConfigurationError,
    EmbeddingError,
    EmbeddingService,
    VectorStore,
    VectorStoreError,
)

LOG_DIRS = {
    "application": "logs/application",
    "audit": "logs/audit",
    "security": "logs/security",
    "access": "logs/access",
}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file before rotation
_BACKUP_COUNT = 5

def _ensure_log_dirs() -> None:
    for path in LOG_DIRS.values():
        os.makedirs(path, exist_ok=True)

def get_logger(name: str, category: str = "application") -> logging.Logger:
    """
    Return a configured logger writing to logs/<category>/<category>.log
    and stdout. Loggers are cached per (category, name) by the stdlib
    logging module, so repeated calls are cheap.
    """
    if category not in LOG_DIRS:
        category = "application"

    _ensure_log_dirs()

    logger = logging.getLogger(f"{category}.{name}")
    if logger.handlers:
        return logger

    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logger.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_path = os.path.join(LOG_DIRS[category], f"{category}.log")
    file_handler = RotatingFileHandler(
        file_path, maxBytes=_MAX_BYTES, backupCount=_BACKUP_COUNT
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    # Prevent double-logging via the root logger.
    logger.propagate = False
    return logger



logger = get_logger(
    __name__,
    "application",
)


# ===========================================================================
# Configuration
# ===========================================================================

UPLOAD_DIR = os.getenv(
    "DOCUMENT_STORAGE_PATH",
    "./knowledge_base/uploads",
)

MAX_UPLOAD_SIZE_BYTES = (
    int(
        os.getenv(
            "RAG_MAX_UPLOAD_SIZE_MB",
            "25",
        )
    )
    * 1024
    * 1024
)


# ===========================================================================
# Exceptions
# ===========================================================================

class IngestionError(Exception):
    """Raised for ingestion failures."""


class IngestionValidationError(
    IngestionError
):
    """Raised when uploaded document validation fails."""


class DuplicateDocumentError(
    IngestionError
):

    def __init__(
        self,
        existing_document_id: str,
    ):

        self.existing_document_id = (
            existing_document_id
        )

        super().__init__(
            "A document with identical content "
            f"already exists "
            f"(id={existing_document_id})."
        )


# ===========================================================================
# Utility functions
# ===========================================================================

def compute_checksum(
    content: bytes,
) -> str:

    """
    Calculate SHA-256 checksum for uploaded content.
    """

    return hashlib.sha256(
        content
    ).hexdigest()


def validate_upload(
    original_filename: str,
    content: bytes,
) -> str:

    """
    Validate filename extension and upload size.

    Returns:
        Lowercase file extension.
    """

    extension = (
        os.path.splitext(
            original_filename
        )[1]
        .lstrip(".")
        .lower()
    )

    if extension not in (
        ALLOWED_DOCUMENT_EXTENSIONS
    ):

        raise IngestionValidationError(
            f"Unsupported file type "
            f"'.{extension}'. "
            f"Supported types: "
            f"{', '.join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))}."
        )

    if len(content) == 0:

        raise IngestionValidationError(
            "Uploaded file is empty."
        )

    if len(content) > MAX_UPLOAD_SIZE_BYTES:

        max_mb = (
            MAX_UPLOAD_SIZE_BYTES
            // (1024 * 1024)
        )

        raise IngestionValidationError(
            f"File exceeds the maximum upload "
            f"size of {max_mb} MB."
        )

    return extension


def sanitize_display_filename(
    original_filename: str,
) -> str:

    """
    Returns a display-only filename.

    IMPORTANT:
        This value is NEVER used as a filesystem path.

    Stored files always use a generated UUID filename.
    """

    base = os.path.basename(
        original_filename
    )

    base = base.replace(
        "\x00",
        "",
    )

    base = base.strip()[:180]

    return (
        base
        or "unnamed_file"
    )


# ===========================================================================
# Document ingestion service
# ===========================================================================

class DocumentIngestionService:

    def __init__(
        self,
        db: Session,
        loader: Optional[
            DocumentLoader
        ] = None,
        chunker: Optional[
            Chunker
        ] = None,
        embedding_service: Optional[
            EmbeddingService
        ] = None,
        vector_store: Optional[
            VectorStore
        ] = None,
    ):

        self.db = db

        self.loader = (
            loader
            or DocumentLoader()
        )

        self.chunker = (
            chunker
            or Chunker()
        )

        self.embedding_service = (
            embedding_service
            or EmbeddingService()
        )

        self.vector_store = (
            vector_store
            or VectorStore()
        )

    # -----------------------------------------------------------------------
    # Upload
    # -----------------------------------------------------------------------

    def ingest_upload(
        self,
        original_filename: str,
        content: bytes,
        owner_id: str,
        department: Optional[str],
        classification: str,
        allowed_roles: List[str],
        allowed_users: List[str],
    ) -> Document:

        # ---------------------------------------------------------------
        # Classification
        # ---------------------------------------------------------------

        classification = (
            classification
            or "internal"
        ).lower()

        if classification not in (
            CLASSIFICATION_LEVELS
        ):

            raise IngestionValidationError(
                f"Invalid classification "
                f"'{classification}'. "
                f"Must be one of: "
                f"{', '.join(CLASSIFICATION_LEVELS)}."
            )

        # ---------------------------------------------------------------
        # Validate upload
        # ---------------------------------------------------------------

        extension = validate_upload(
            original_filename,
            content,
        )

        # ---------------------------------------------------------------
        # Calculate checksum
        # ---------------------------------------------------------------

        checksum = compute_checksum(
            content
        )

        # ---------------------------------------------------------------
        # Duplicate check
        # ---------------------------------------------------------------

        existing = (
            self.db.query(Document)
            .filter(
                Document.checksum
                == checksum
            )
            .first()
        )

        if existing:

            raise DuplicateDocumentError(
                existing.id
            )

        # ---------------------------------------------------------------
        # Secure file storage
        # ---------------------------------------------------------------

        os.makedirs(
            UPLOAD_DIR,
            exist_ok=True,
        )

        stored_filename = (
            f"{uuid.uuid4().hex}."
            f"{extension}"
        )

        stored_path = os.path.join(
            UPLOAD_DIR,
            stored_filename,
        )

        try:

            with open(
                stored_path,
                "wb",
            ) as handle:

                handle.write(
                    content
                )

        except OSError as exc:

            raise IngestionError(
                f"Failed to store uploaded "
                f"document: {exc}"
            ) from exc

        # ---------------------------------------------------------------
        # Create DB document record
        # ---------------------------------------------------------------

        document = Document(
            id=str(uuid.uuid4()),

            filename=sanitize_display_filename(
                original_filename
            ),

            stored_filename=stored_filename,

            file_type=extension,

            checksum=checksum,

            file_size=len(content),

            department=department,

            classification=classification,

            allowed_roles=(
                ",".join(allowed_roles)
                if allowed_roles
                else None
            ),

            allowed_users=(
                ",".join(allowed_users)
                if allowed_users
                else None
            ),

            owner_id=owner_id,

            status="processing",

            uploaded_at=datetime.utcnow(),
        )

        self.db.add(document)

        try:

            self.db.commit()
            self.db.refresh(document)

        except Exception:

            self.db.rollback()

            try:

                if os.path.isfile(
                    stored_path
                ):
                    os.remove(
                        stored_path
                    )

            except OSError:
                pass

            raise

        # ---------------------------------------------------------------
        # Process document
        # ---------------------------------------------------------------

        try:

            self._process_document(
                document,
                stored_path,
            )

        except IngestionError:

            raise

        except Exception as exc:

            self._mark_failed(
                document,
                str(exc),
            )

            raise IngestionError(
                f"Ingestion failed: {exc}"
            ) from exc

        return document

    # -----------------------------------------------------------------------
    # Process document
    # -----------------------------------------------------------------------

    def _process_document(
        self,
        document: Document,
        stored_path: str,
    ) -> None:

        # ---------------------------------------------------------------
        # Load document
        # ---------------------------------------------------------------

        try:

            loaded = self.loader.load(
                stored_path,
                file_type=document.file_type,
            )

        except (
            DocumentLoadError,
            UnsupportedFileTypeError,
            EmptyDocumentError,
        ) as exc:

            raise IngestionError(
                str(exc)
            ) from exc

        # ---------------------------------------------------------------
        # Clean pages
        # ---------------------------------------------------------------

        cleaned_pages = [
            (
                page.page_number,
                clean_text(page.text),
            )
            for page in loaded.pages
        ]

        # ---------------------------------------------------------------
        # Chunk pages
        # ---------------------------------------------------------------

        text_chunks = (
            self.chunker.chunk_pages(
                cleaned_pages
            )
        )

        if not text_chunks:

            raise IngestionError(
                f"No usable text chunks could "
                f"be produced from "
                f"'{document.filename}'."
            )

        # ---------------------------------------------------------------
        # Security metadata
        # ---------------------------------------------------------------

        allowed_roles = (
            document.allowed_roles.split(",")
            if document.allowed_roles
            else []
        )

        allowed_users = (
            document.allowed_users.split(",")
            if document.allowed_users
            else []
        )

        # ---------------------------------------------------------------
        # Stable chunk IDs
        # ---------------------------------------------------------------

        chunk_ids = [
            generate_chunk_id(
                document.checksum,
                chunk.page_number,
                chunk.chunk_index,
            )
            for chunk in text_chunks
        ]

        texts = [
            chunk.text
            for chunk in text_chunks
        ]

        # ---------------------------------------------------------------
        # Generate embeddings
        # ---------------------------------------------------------------

        try:

            vectors = (
                self.embedding_service
                .embed_documents(
                    texts
                )
            )

        except (
            EmbeddingError,
            EmbeddingConfigurationError,
        ) as exc:

            raise IngestionError(
                f"Embedding generation failed: "
                f"{exc}"
            ) from exc

        # ---------------------------------------------------------------
        # Prepare vector metadata
        # ---------------------------------------------------------------

        metadatas = [

            {
                "chunk_id": chunk_ids[i],

                "document_id": document.id,

                "filename": document.filename,

                "page_number": (
                    text_chunks[i].page_number
                ),

                "chunk_index": (
                    text_chunks[i].chunk_index
                ),

                "text": texts[i],

                "department": (
                    document.department
                ),

                "classification": (
                    document.classification
                ),

                "allowed_roles": (
                    allowed_roles
                ),

                "allowed_users": (
                    allowed_users
                ),

                "owner_id": (
                    document.owner_id
                ),
            }

            for i in range(
                len(text_chunks)
            )
        ]

        # ---------------------------------------------------------------
        # Store vectors
        # ---------------------------------------------------------------

        try:

            vector_ids = (
                self.vector_store.add(
                    vectors,
                    metadatas,
                )
            )

        except VectorStoreError as exc:

            raise IngestionError(
                f"Vector storage failed: "
                f"{exc}"
            ) from exc

        # ---------------------------------------------------------------
        # Store DB chunk metadata
        # ---------------------------------------------------------------

        try:

            for i, chunk in enumerate(
                text_chunks
            ):

                self.db.add(
                    DocumentChunk(
                        id=chunk_ids[i],

                        document_id=document.id,

                        chunk_index=(
                            chunk.chunk_index
                        ),

                        page_number=(
                            chunk.page_number
                        ),

                        text=chunk.text,

                        vector_id=(
                            vector_ids[i]
                        ),

                        created_at=(
                            datetime.utcnow()
                        ),
                    )
                )

            # -----------------------------------------------------------
            # Mark indexed
            # -----------------------------------------------------------

            document.status = "indexed"

            document.page_count = (
                loaded.page_count
            )

            document.indexed_at = (
                datetime.utcnow()
            )

            document.error_message = None

            self.db.commit()

        except Exception as exc:

            self.db.rollback()

            # Clean vectors if DB persistence fails
            try:

                self.vector_store.delete(
                    document.id
                )

            except VectorStoreError:

                logger.warning(
                    "Could not clean vectors "
                    "after DB failure for "
                    "document id=%s",
                    document.id,
                )

            raise IngestionError(
                f"Failed to persist document "
                f"chunks: {exc}"
            ) from exc

        logger.info(
            "Document indexed: "
            "id=%s filename=%s chunks=%d",
            document.id,
            document.filename,
            len(text_chunks),
        )

    # -----------------------------------------------------------------------
    # Reindex
    # -----------------------------------------------------------------------

    def reindex(
        self,
        document: Document,
    ) -> Document:

        stored_path = os.path.join(
            UPLOAD_DIR,
            document.stored_filename,
        )

        if not os.path.isfile(
            stored_path
        ):

            raise IngestionError(
                "The original uploaded file "
                "is no longer available on disk "
                "and cannot be reindexed."
            )

        # Remove existing vectors
        self.vector_store.delete(
            document.id
        )

        # Remove existing DB chunks
        (
            self.db.query(
                DocumentChunk
            )
            .filter(
                DocumentChunk.document_id
                == document.id
            )
            .delete()
        )

        document.status = "processing"
        document.error_message = None

        self.db.commit()

        try:

            self._process_document(
                document,
                stored_path,
            )

        except IngestionError:

            raise

        except Exception as exc:

            self._mark_failed(
                document,
                str(exc),
            )

            raise IngestionError(
                f"Reindexing failed: {exc}"
            ) from exc

        return document

    # -----------------------------------------------------------------------
    # Mark failed
    # -----------------------------------------------------------------------

    def _mark_failed(
        self,
        document: Document,
        reason: str,
    ) -> None:

        self.db.rollback()

        # Remove DB chunks
        try:

            (
                self.db.query(
                    DocumentChunk
                )
                .filter(
                    DocumentChunk.document_id
                    == document.id
                )
                .delete()
            )

        except Exception as exc:

            logger.warning(
                "Failed to remove DB chunks "
                "for failed document id=%s: %s",
                document.id,
                exc,
            )

        # Remove vectors
        try:

            self.vector_store.delete(
                document.id
            )

        except VectorStoreError:

            logger.warning(
                "Could not clean up vectors "
                "for failed document id=%s",
                document.id,
            )

        document.status = "failed"

        document.error_message = (
            str(reason)[:500]
        )

        self.db.add(document)

        self.db.commit()

        logger.error(
            "Document ingestion failed: "
            "id=%s reason=%s",
            document.id,
            reason,
        )

    # -----------------------------------------------------------------------
    # Delete document
    # -----------------------------------------------------------------------

    def delete_document(
        self,
        document: Document,
    ) -> None:

        # Remove vectors
        try:

            self.vector_store.delete(
                document.id
            )

        except VectorStoreError as exc:

            raise IngestionError(
                f"Failed to delete document "
                f"vectors: {exc}"
            ) from exc

        # Remove original file
        stored_path = os.path.join(
            UPLOAD_DIR,
            document.stored_filename,
        )

        if os.path.isfile(
            stored_path
        ):

            try:

                os.remove(
                    stored_path
                )

            except OSError as exc:

                logger.warning(
                    "Failed to remove stored "
                    "file for document id=%s: %s",
                    document.id,
                    exc,
                )

        # Remove database document
        self.db.delete(
            document
        )

        self.db.commit()