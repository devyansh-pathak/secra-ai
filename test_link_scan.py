from rag.link_scanner import scan_pdf_links

results = scan_pdf_links(
    "knowledge_base/uploads/MRPL.pdf"
)

print("RESULTS:")
print(results)
