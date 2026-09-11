import hashlib
import os
import re

from dataclasses import dataclass
from typing import List, Optional


_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE = re.compile(r"(?<!\d)(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3,4}\)?[-.\s]?){2,3}\d{3,4}(?!\d)")
_PAN_IN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
_AADHAAR_IN = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b")
_CREDIT_CARD = re.compile(r"\b(?:\d[ -]*?){13,19}\b")
_JWT = re.compile(r"\bey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")

_PASSWORD_FIELD = re.compile(r"\b(?:password|pwd|passwd)\s*[:=]\s*\S+", re.IGNORECASE)

_PATTERNS = [
    ("JWT", _JWT),
    ("PASSWORD_FIELD", _PASSWORD_FIELD),
    ("EMAIL", _EMAIL),
    ("PAN_IN", _PAN_IN),
    ("CREDIT_CARD", _CREDIT_CARD),
    ("AADHAAR_IN", _AADHAAR_IN),
    ("PHONE", _PHONE),
]

REDACTION_MODES = ("disabled", "log_only", "redact", "strict")

def _luhn_valid(number: str) -> bool:
    digits = [int(d) for d in number if d.isdigit()]
    if len(digits) < 13:
        return False
    checksum = 0
    parity = len(digits) % 2
    for i, digit in enumerate(digits):
        if i % 2 == parity:
            digit *= 2
            if digit > 9:
                digit -= 9
        checksum += digit
    return checksum % 10 == 0


def fingerprint(value: str) -> str:
    """Irreversible one-way fingerprint; never allows recovering the original value."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


@dataclass
class Detection:
    category: str
    start: int
    end: int
    fingerprint: str


class RedactionEngine:
    def __init__(self, mode: str = None):
        self.mode = (mode or os.getenv("REDACTION_MODE", "redact")).strip().lower()
        if self.mode not in REDACTION_MODES:
            self.mode = "redact"

    def detect(self, text: str) -> List[Detection]:
        if not text:
            return []
        detections: List[Detection] = []
        claimed_spans: List[tuple] = []

        for category, pattern in _PATTERNS:
            for match in pattern.finditer(text):
                start, end = match.span()
                if any(start < c_end and end > c_start for c_start, c_end in claimed_spans):
                    continue  

                value = match.group()
                if category == "CREDIT_CARD" and not _luhn_valid(value):
                    continue  # reduces false positives on ordinary long numbers (invoice IDs, etc.)
                if category == "PHONE" and sum(c.isdigit() for c in value) < 7:
                    continue  # too short to plausibly be a phone number

                claimed_spans.append((start, end))
                detections.append(Detection(category=category, start=start, end=end, fingerprint=fingerprint(value)))

        return sorted(detections, key=lambda d: d.start)

    def redact_text(self, text: str) -> "RedactionResult":
        """
        Returns the (possibly modified) text and the list of detections,
        behaving according to self.mode. Never logs or returns the raw
        matched values themselves outside of the redacted text — callers
        only ever see fingerprints for audit purposes.
        """
        if self.mode == "disabled" or not text:
            return RedactionResult(text=text, detections=[], modified=False)

        detections = self.detect(text)
        if not detections:
            return RedactionResult(text=text, detections=[], modified=False)

        if self.mode == "log_only":
            return RedactionResult(text=text, detections=detections, modified=False)

        # redact / strict: replace each detected span with a placeholder,
        # working right-to-left so earlier offsets stay valid.
        redacted = text
        for detection in sorted(detections, key=lambda d: d.start, reverse=True):
            placeholder = f"[REDACTED_{detection.category}]"
            redacted = redacted[: detection.start] + placeholder + redacted[detection.end :]

        return RedactionResult(text=redacted, detections=detections, modified=True)

@dataclass
class RedactionResult:
    text: str
    detections: List[Detection]
    modified: bool

CLASSIFICATION_LEVELS = ["public", "internal", "confidential", "restricted", "highly_restricted"]

_TYPE_KEYWORDS = {
    "contract": ["contract", "agreement", "nda", "msa", "sow"],
    "policy": ["policy", "handbook", "procedure", "guideline"],
    "financial": ["invoice", "budget", "expense", "financial", "payroll"],
    "compliance": ["compliance", "audit", "regulation", "control"],
    "report": ["report", "summary", "analysis"],
}

_SENSITIVE_TO_MIN_CLASSIFICATION = {
    "AADHAAR_IN": "restricted",
    "PAN_IN": "confidential",
    "CREDIT_CARD": "restricted",
    "API_KEY": "highly_restricted",
    "JWT": "highly_restricted",
    "PASSWORD_FIELD": "highly_restricted",
    "PHONE": "internal",
    "EMAIL": "internal",
}


@dataclass
class ClassificationResult:
    document_type: str
    suggested_classification: str
    contains_sensitive_data: bool
    requires_ocr: bool
    detected_categories: List[str]


class DocumentClassifier:
    def __init__(self, redaction_engine: Optional[RedactionEngine] = None):
        self.redaction_engine = redaction_engine or RedactionEngine()

    def _infer_document_type(self, filename: str, sample_text: str) -> str:
        haystack = f"{filename} {sample_text[:2000]}".lower()
        for doc_type, keywords in _TYPE_KEYWORDS.items():
            if any(keyword in haystack for keyword in keywords):
                return doc_type
        return "general"

    def classify(self, filename: str, text: str, requires_ocr: bool, declared_classification: str) -> ClassificationResult:
        declared_classification = (declared_classification or "internal").lower()
        if declared_classification not in CLASSIFICATION_LEVELS:
            declared_classification = "internal"

        detections = self.redaction_engine.detect(text)
        detected_categories = sorted({d.category for d in detections})

        min_required = declared_classification
        for category in detected_categories:
            required_for_category = _SENSITIVE_TO_MIN_CLASSIFICATION.get(category)
            if required_for_category and (
                CLASSIFICATION_LEVELS.index(required_for_category) > CLASSIFICATION_LEVELS.index(min_required)
            ):
                min_required = required_for_category

        document_type = self._infer_document_type(filename, text)

        return ClassificationResult(
            document_type=document_type,
            suggested_classification=min_required,
            contains_sensitive_data=len(detections) > 0,
            requires_ocr=requires_ocr,
            detected_categories=detected_categories,
        )