"""
Retrieval module.

Combines:
    - embedding generation
    - FAISS vector storage
    - cross-encoder reranking
    - authorization-aware retrieval

IMPORTANT SECURITY GUARANTEE:

Authorization filtering happens BEFORE reranking and BEFORE
authorized document text is returned to the calling agent.
"""

import json
import os
import threading
from typing import Any, Dict, List, Optional, Set, Tuple
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
import numpy as np
import uuid
import logging
from sqlalchemy.orm import Session, declarative_base
from sqlalchemy.orm import relationship
Base = declarative_base() 

from logging.handlers import RotatingFileHandler

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

logger = get_logger(__name__, "application")

def generate_uuid() -> str:
    return str(uuid.uuid4())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)
    resource = Column(String(128), nullable=True)
    status = Column(String(16), nullable=False)  # "success" | "failure"
    risk_level = Column(String(16), default="low", nullable=False)
    ip_address = Column(String(64), nullable=True)
    correlation_id = Column(String(36), nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="audit_logs")

audit_logger = get_logger("audit_events", "audit")

def new_id() -> str:
    """Generate a UUID4 string, used as the primary key for most tables."""
    return str(uuid.uuid4())

def record_audit_event(
    db: Session,
    action: str,
    status: str,
    user_id: Optional[str] = None,
    resource: Optional[str] = None,
    risk_level: str = "low",
    ip_address: Optional[str] = None,
    correlation_id: Optional[str] = None,
    details: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        id=new_id(),
        user_id=user_id,
        action=action,
        resource=resource,
        status=status,
        risk_level=risk_level,
        ip_address=ip_address,
        correlation_id=correlation_id,
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    audit_logger.info(
        "action=%s user=%s status=%s resource=%s risk=%s ip=%s correlation_id=%s",
        action, user_id, status, resource, risk_level, ip_address, correlation_id,
    )
    return entry


def can_access_document(
    user_roles: Set[str],
    user_id: Optional[str],
    user_permissions: Set[str],
    doc_meta: Dict[str, Any],
) -> bool:
    """
    Authorization decision for a single document (or a chunk carrying
    that document's security metadata). Checks, in order:

    1. admin:all always allowed.
    2. Explicit per-user grant (allowed_users) always allowed.
    3. The document's owner is always allowed.
    4. classification == "public" is allowed to anyone.
    5. Explicit per-role grant (allowed_roles intersects user_roles).
    6. classification == "internal" with NO explicit allowed_roles set
       is allowed to any authenticated user (a default-open internal
       policy document, e.g. an employee handbook).
    7. Everything else — confidential/restricted documents with no
       matching role or user grant — is denied.
    """
    if "admin:all" in user_permissions:
        return True

    allowed_users = doc_meta.get("allowed_users") or []
    if user_id and user_id in allowed_users:
        return True

    if user_id and doc_meta.get("owner_id") == user_id:
        return True

    classification = (doc_meta.get("classification") or "internal").lower()

    if classification == "public":
        return True

    allowed_roles = doc_meta.get("allowed_roles") or []

    print(doc_meta)
    print("classification =", classification)
    print("allowed_roles =", allowed_roles)

    if allowed_roles and user_roles.intersection(allowed_roles):
        return True

    if not allowed_roles and classification == "internal":
        return True

    return False

# ===========================================================================
# Embeddings
# ===========================================================================

DEFAULT_EMBEDDING_MODEL = (
    "sentence-transformers/all-MiniLM-L6-v2"
)


class EmbeddingConfigurationError(Exception):
    """Raised when the embedding model cannot be configured."""


class EmbeddingError(Exception):
    """Raised when embedding generation fails."""


class EmbeddingService:

    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls) -> "EmbeddingService":

        with cls._instance_lock:

            if cls._instance is None:

                inst = super().__new__(cls)

                inst._model = None
                inst._load_lock = threading.Lock()
                inst._dimension = None

                cls._instance = inst

            return cls._instance

    @staticmethod
    def _model_name() -> str:

        return (
            os.getenv(
                "EMBEDDING_MODEL",
                DEFAULT_EMBEDDING_MODEL,
            ).strip()
            or DEFAULT_EMBEDDING_MODEL
        )

    def _get_model(self):

        if self._model is not None:
            return self._model

        with self._load_lock:

            if self._model is not None:
                return self._model

            model_name = self._model_name()

            try:

                from sentence_transformers import (
                    SentenceTransformer,
                )

            except ImportError as exc:

                raise EmbeddingConfigurationError(
                    "sentence-transformers is not installed. "
                    "Run 'pip install -r requirements.txt'."
                ) from exc

            logger.info(
                "Loading embedding model '%s'...",
                model_name,
            )

            try:

                model = SentenceTransformer(
                    model_name
                )

            except Exception as exc:

                raise EmbeddingConfigurationError(
                    f"Failed to load embedding model "
                    f"'{model_name}': {exc}. "
                    "Verify the model ID and network access "
                    "or provide a locally cached model."
                ) from exc

            self._model = model

            self._dimension = (
                model.get_sentence_embedding_dimension()
            )

            logger.info(
                "Embedding model loaded: %s (dim=%d)",
                model_name,
                self._dimension,
            )

            return self._model

    @property
    def dimension(self) -> int:

        self._get_model()

        return self._dimension

    def embed_documents(
        self,
        texts: List[str],
        batch_size: int = 32,
    ) -> np.ndarray:

        if not texts:

            return np.zeros(
                (0, self.dimension),
                dtype="float32",
            )

        model = self._get_model()

        try:

            vectors = model.encode(
                texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )

        except Exception as exc:

            raise EmbeddingError(
                f"Failed to generate document embeddings: {exc}"
            ) from exc

        return vectors.astype("float32")

    def embed_query(
        self,
        text: str,
    ) -> np.ndarray:

        if not text or not text.strip():

            raise EmbeddingError(
                "Query text cannot be empty."
            )

        model = self._get_model()

        try:

            vector = model.encode(
                [text],
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )

        except Exception as exc:

            raise EmbeddingError(
                f"Failed to generate query embedding: {exc}"
            ) from exc

        return vector.astype("float32")[0]


def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()


# ===========================================================================
# FAISS Vector Store
# ===========================================================================

INDEX_DIR = os.getenv(
    "FAISS_INDEX_PATH",
    "./vector_db/faiss_index",
)

METADATA_DIR = os.getenv(
    "METADATA_STORE_PATH",
    "./vector_db/metadata",
)

INDEX_FILE = os.path.join(
    INDEX_DIR,
    "index.faiss",
)

METADATA_FILE = os.path.join(
    METADATA_DIR,
    "metadata.json",
)


class VectorStoreError(Exception):
    """Raised for vector store failures."""


class VectorStore:

    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls) -> "VectorStore":

        with cls._instance_lock:

            if cls._instance is None:

                inst = super().__new__(cls)

                inst._lock = threading.Lock()
                inst._index = None
                inst._metadata = {}
                inst._next_id = 0
                inst._dimension = None
                inst._loaded = False

                cls._instance = inst

            return cls._instance

    def _get_faiss(self):

        try:

            import faiss

        except ImportError as exc:

            raise VectorStoreError(
                "faiss-cpu is not installed. "
                "Run 'pip install -r requirements.txt'."
            ) from exc

        return faiss

    def _ensure_loaded(self):

        if self._loaded:
            return

        with self._lock:

            if self._loaded:
                return

            os.makedirs(
                INDEX_DIR,
                exist_ok=True,
            )

            os.makedirs(
                METADATA_DIR,
                exist_ok=True,
            )

            if os.path.isfile(METADATA_FILE):

                try:

                    with open(
                        METADATA_FILE,
                        "r",
                        encoding="utf-8",
                    ) as handle:

                        raw = json.load(handle)

                    self._next_id = raw.get(
                        "next_id",
                        0,
                    )

                    self._dimension = raw.get(
                        "dimension"
                    )

                    self._metadata = {
                        int(k): v
                        for k, v in raw.get(
                            "vectors",
                            {},
                        ).items()
                    }

                except Exception as exc:

                    raise VectorStoreError(
                        f"Failed to load vector metadata: {exc}"
                    ) from exc

            if (
                os.path.isfile(INDEX_FILE)
                and self._dimension
            ):

                try:

                    faiss = self._get_faiss()

                    self._index = faiss.read_index(
                        INDEX_FILE
                    )

                except Exception as exc:

                    logger.error(
                        "Failed to load FAISS index: %s",
                        exc,
                    )

                    self._index = None

            self._loaded = True

    def _init_index(
        self,
        dimension: int,
    ):

        faiss = self._get_faiss()

        base = faiss.IndexFlatIP(
            dimension
        )

        self._index = faiss.IndexIDMap2(
            base
        )

        self._dimension = dimension

    def add(
        self,
        vectors: np.ndarray,
        metadatas: List[Dict[str, Any]],
    ) -> List[int]:

        self._ensure_loaded()

        if vectors.shape[0] != len(metadatas):

            raise VectorStoreError(
                "vectors and metadatas length mismatch"
            )

        if vectors.shape[0] == 0:
            return []

        if vectors.ndim != 2:

            raise VectorStoreError(
                "vectors must be a 2-dimensional array"
            )

        with self._lock:

            dimension = vectors.shape[1]

            if self._index is None:

                self._init_index(
                    dimension
                )

            elif self._dimension != dimension:

                raise VectorStoreError(
                    f"Embedding dimension mismatch. "
                    f"Index has {self._dimension}, "
                    f"received {dimension}. "
                    "Rebuild and reindex the documents."
                )

            ids = list(
                range(
                    self._next_id,
                    self._next_id
                    + vectors.shape[0],
                )
            )

            id_array = np.array(
                ids,
                dtype="int64",
            )

            self._index.add_with_ids(
                vectors.astype("float32"),
                id_array,
            )

            for vector_id, metadata in zip(
                ids,
                metadatas,
            ):

                self._metadata[
                    vector_id
                ] = metadata

            self._next_id += vectors.shape[0]

            self._save()

            return ids

    def search(
        self,
        query_vector: np.ndarray,
        top_k: int,
    ) -> List[Tuple[Dict[str, Any], float]]:

        self._ensure_loaded()

        if (
            self._index is None
            or self._index.ntotal == 0
        ):

            return []

        if top_k <= 0:
            return []

        query = query_vector.astype(
            "float32"
        ).reshape(1, -1)

        if (
            self._dimension is not None
            and query.shape[1] != self._dimension
        ):

            raise VectorStoreError(
                f"Query vector dimension {query.shape[1]} "
                f"does not match index dimension "
                f"{self._dimension}."
            )

        with self._lock:

            scores, ids = self._index.search(
                query,
                min(
                    top_k,
                    self._index.ntotal,
                ),
            )

        results = []

        for score, vector_id in zip(
            scores[0],
            ids[0],
        ):

            if vector_id == -1:
                continue

            metadata = self._metadata.get(
                int(vector_id)
            )

            if metadata is None:
                continue

            results.append(
                (
                    metadata,
                    float(score),
                )
            )

        return results

    def delete(
        self,
        document_id: str,
    ) -> int:

        self._ensure_loaded()

        with self._lock:

            ids_to_remove = [
                vector_id
                for vector_id, metadata
                in self._metadata.items()
                if metadata.get(
                    "document_id"
                ) == document_id
            ]

            if not ids_to_remove:
                return 0

            if self._index is not None:

                faiss = self._get_faiss()

                selector = (
                    faiss.IDSelectorBatch(
                        np.array(
                            ids_to_remove,
                            dtype="int64",
                        )
                    )
                )

                self._index.remove_ids(
                    selector
                )

            for vector_id in ids_to_remove:

                self._metadata.pop(
                    vector_id,
                    None,
                )

            self._save()

            return len(ids_to_remove)

    def rebuild(self):

        with self._lock:

            self._index = None
            self._metadata = {}
            self._next_id = 0
            self._dimension = None

            self._save()

            self._loaded = True

    def _save(self):

        os.makedirs(
            INDEX_DIR,
            exist_ok=True,
        )

        os.makedirs(
            METADATA_DIR,
            exist_ok=True,
        )

        if self._index is not None:

            faiss = self._get_faiss()

            faiss.write_index(
                self._index,
                INDEX_FILE,
            )

        elif os.path.isfile(INDEX_FILE):

            os.remove(INDEX_FILE)

        with open(
            METADATA_FILE,
            "w",
            encoding="utf-8",
        ) as handle:

            json.dump(
                {
                    "next_id": self._next_id,
                    "dimension": self._dimension,
                    "vectors": {
                        str(k): v
                        for k, v
                        in self._metadata.items()
                    },
                },
                handle,
                ensure_ascii=False,
            )

    @property
    def total_vectors(self) -> int:

        self._ensure_loaded()

        if self._index is None:
            return 0

        return self._index.ntotal


def get_vector_store() -> VectorStore:
    return VectorStore()


# ===========================================================================
# Reranker
# ===========================================================================

DEFAULT_RERANKER_MODEL = (
    "cross-encoder/ms-marco-MiniLM-L-6-v2"
)


class Reranker:

    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls) -> "Reranker":

        with cls._instance_lock:

            if cls._instance is None:

                inst = super().__new__(cls)

                inst._model = None
                inst._load_lock = threading.Lock()

                cls._instance = inst

            return cls._instance

    @property
    def enabled(self) -> bool:

        return (
            os.getenv(
                "RERANKER_ENABLED",
                "true",
            )
            .strip()
            .lower()
            in (
                "1",
                "true",
                "yes",
            )
        )

    @staticmethod
    def _model_name() -> str:

        return (
            os.getenv(
                "RERANKER_MODEL_NAME",
                DEFAULT_RERANKER_MODEL,
            ).strip()
            or DEFAULT_RERANKER_MODEL
        )

    def _get_model(self):

        if self._model is not None:
            return self._model

        with self._load_lock:

            if self._model is not None:
                return self._model

            try:

                from sentence_transformers import (
                    CrossEncoder,
                )

            except ImportError as exc:

                raise ImportError(
                    "sentence-transformers is required "
                    "for reranking."
                ) from exc

            model_name = self._model_name()

            logger.info(
                "Loading reranker model '%s'...",
                model_name,
            )

            self._model = CrossEncoder(
                model_name
            )

            logger.info(
                "Reranker model loaded: %s",
                model_name,
            )

            return self._model

    def rerank(
        self,
        query: str,
        chunks: List,
    ) -> List:

        if (
            not self.enabled
            or not chunks
        ):

            return chunks

        try:

            model = self._get_model()

            pairs = [
                (
                    query,
                    chunk.text,
                )
                for chunk in chunks
            ]

            scores = model.predict(
                pairs
            )

        except Exception as exc:

            logger.warning(
                "Reranker unavailable; "
                "falling back to original order: %s",
                exc,
            )

            return chunks

        for chunk, score in zip(
            chunks,
            scores,
        ):

            chunk.rerank_score = float(
                score
            )

        return sorted(
            chunks,
            key=lambda chunk: (
                chunk.rerank_score
                if chunk.rerank_score is not None
                else float("-inf")
            ),
            reverse=True,
        )


def get_reranker() -> Reranker:
    return Reranker()


# ===========================================================================
# Retrieval
# ===========================================================================

DEFAULT_TOP_K = int(
    os.getenv(
        "RAG_TOP_K",
        "8",
    )
)

DEFAULT_SCORE_THRESHOLD = float(
    os.getenv(
        "RAG_SCORE_THRESHOLD",
        "0.40",
    )
)

CANDIDATE_MULTIPLIER = 4
MIN_CANDIDATES = 20


class RetrievalError(Exception):
    """Raised when retrieval fails."""


class RetrievedChunk:

    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        filename: str,
        page: Optional[int],
        text: str,
        score: float,
        department: Optional[str] = None,
        classification: Optional[str] = None,
        rerank_score: Optional[float] = None,
    ):

        self.chunk_id = chunk_id
        self.document_id = document_id
        self.filename = filename
        self.page = page
        self.text = text
        self.score = score
        self.department = department
        self.classification = classification
        self.rerank_score = rerank_score

    def to_source_dict(
        self,
    ) -> Dict[str, Any]:
        """
        Returns safe citation metadata.

        Raw chunk text is intentionally NOT returned here.
        """

        return {
            "document_id": self.document_id,
            "filename": self.filename,
            "page": self.page,
            "chunk_id":self.chunk_id,
            "classification": self.classification
        }


class RetrievalService:

    def __init__(
        self,
        embedding_service: Optional[
            EmbeddingService
        ] = None,
        vector_store: Optional[
            VectorStore
        ] = None,
        reranker: Optional[
            Reranker
        ] = None,
        top_k: int = DEFAULT_TOP_K,
        score_threshold: float = DEFAULT_SCORE_THRESHOLD,
    ):

        self.embedding_service = (
            embedding_service
            or EmbeddingService()
        )

        self.vector_store = (
            vector_store
            or VectorStore()
        )

        self.reranker = reranker

        self.top_k = top_k
        self.score_threshold = score_threshold

    def retrieve(
        self,
        query: str,
        user_id: Optional[str],
        user_roles: Set[str],
        user_permissions: Set[str],
        top_k: Optional[int] = None,
        db=None,
        correlation_id: Optional[str] = None,
    ) -> List[RetrievedChunk]:

        if not query or not query.strip():

            raise RetrievalError(
                "Query cannot be empty."
            )

        effective_top_k = (
            top_k
            if top_k is not None
            else self.top_k
        )

        if effective_top_k <= 0:

            raise RetrievalError(
                "top_k must be greater than zero."
            )

        # ---------------------------------------------------------------
        # Step 1: Query embedding
        # ---------------------------------------------------------------

        try:

            query_vector = (
                self.embedding_service
                .embed_query(query)
            )

        except (
            EmbeddingError,
            EmbeddingConfigurationError,
        ) as exc:

            raise RetrievalError(
                str(exc)
            ) from exc

        # ---------------------------------------------------------------
        # Step 2: Retrieve broad candidate set
        # ---------------------------------------------------------------

        candidate_k = max(
            effective_top_k
            * CANDIDATE_MULTIPLIER,
            MIN_CANDIDATES,
        )

        try:

            raw_results = (
                self.vector_store.search(
                    query_vector,
                    candidate_k,
                )
            )

        except VectorStoreError as exc:

            raise RetrievalError(
                str(exc)
            ) from exc

        # ---------------------------------------------------------------
        # Step 3: AUTHORIZATION FILTER
        #
        # IMPORTANT:
        # Unauthorized content is rejected BEFORE reranking.
        # ---------------------------------------------------------------

        authorized: List[
            RetrievedChunk
        ] = []

        seen_chunk_ids = set()

        denied_count = 0

        for metadata, score in raw_results:

            print("\n===== RESULT =====")
            print(metadata)
            print("score =", score)

            print("THRESHOLD =",self.score_threshold)

            if score < self.score_threshold:
                continue

            chunk_id = metadata.get(
                "chunk_id"
            )

            if (
                not chunk_id
                or chunk_id in seen_chunk_ids
            ):
                continue

            print("CHECKING ACCESS")

            print("ACCESS RESULT =",
                  can_access_document(
                      user_roles,
                      user_id,
                      user_permissions,
                      metadata,
                  ))
            if not can_access_document(
                user_roles,
                user_id,
                user_permissions,
                metadata,
            ):

                denied_count += 1
                continue

            seen_chunk_ids.add(
                chunk_id
            )

            authorized.append(
                RetrievedChunk(
                    chunk_id=chunk_id,
                    document_id=metadata.get(
                        "document_id",
                        "",
                    ),
                    filename=metadata.get(
                        "filename",
                        "unknown",
                    ),
                    page=metadata.get(
                        "page_number"
                    ),
                    text=metadata.get(
                        "text",
                        "",
                    ),
                    score=float(score),
                    department=metadata.get(
                        "department"
                    ),
                    classification=metadata.get(
                        "classification"
                    ),
                )
            )

        # ---------------------------------------------------------------
        # Step 4: Reranking
        #
        # Reranker receives ONLY authorized chunks.
        # ---------------------------------------------------------------

        if (
            self.reranker is not None
            and authorized
        ):

            authorized = (
                self.reranker.rerank(
                    query,
                    authorized,
                )
            )

        # ---------------------------------------------------------------
        # Step 5: Final top-K
        # ---------------------------------------------------------------

        final_results = authorized[
            :effective_top_k
        ]

        # ---------------------------------------------------------------
        # Step 6: Audit
        # ---------------------------------------------------------------

        if db is not None:

            record_audit_event(
                db,
                action="document_retrieval",
                status="success",
                user_id=user_id,
                resource=None,
                risk_level="low",
                correlation_id=correlation_id,
                details=(
                    f"candidates={len(raw_results)} "
                    f"authorized={len(authorized)} "
                    f"denied={denied_count} "
                    f"returned={len(final_results)}"
                ),
            )

        logger.info(
            "Retrieval complete: "
            "user=%s candidates=%d authorized=%d "
            "denied=%d returned=%d",
            user_id,
            len(raw_results),
            len(authorized),
            denied_count,
            len(final_results),
        )

        return final_results


def get_retrieval_service(
    embedding_service: Optional[
        EmbeddingService
    ] = None,
    vector_store: Optional[
        VectorStore
    ] = None,
    reranker: Optional[
        Reranker
    ] = None,
) -> RetrievalService:

    return RetrievalService(
        embedding_service=embedding_service,
        vector_store=vector_store,
        reranker=reranker,
    )

from rag.ollama_llm import get_llm

def ask_question(query):

    retrieval = get_retrieval_service()

    chunks = retrieval.retrieve(
        query=query,
        user_id=None,
        user_roles=set(),
        user_permissions=set()
    )

    context = "\n\n".join(
        chunk.text
        for chunk in chunks
    )

    prompt = f"""
Context:

{context}

Question:
{query}

Answer using only the context above.
"""

    llm = get_llm()

    answer = llm.generate(prompt)

    return answer