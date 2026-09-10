from pypdf import PdfReader

pdf_path = "knowledge_base/uploads/MRPL.pdf"

try:
    reader = PdfReader(pdf_path)

    print("PDF Loaded Successfully")
    print("Pages:", len(reader.pages))

    for i, page in enumerate(reader.pages):
        print(f"\n--- Page {i+1} ---")
        print(page.extract_text())

except Exception as e:
    print("ERROR:", e)