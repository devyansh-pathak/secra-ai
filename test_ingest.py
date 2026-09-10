from pathlib import Path
from rag.ingestion import DocumentIngestionService
from database import SessionLocal

db = SessionLocal()

service = DocumentIngestionService(db)

with open("finance.txt", "rb") as f:
    content = f.read()

doc = service.ingest_upload(
    original_filename="finance.txt",
    content=content,
    owner_id="admin",
    department="Finance",
    classification="internal",
    allowed_roles=[],
    allowed_users=[]
)

print("SUCCESS")
print("Document ID:",doc.id)