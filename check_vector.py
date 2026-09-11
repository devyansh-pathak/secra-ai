import sqlite3

conn = sqlite3.connect("enterprise_ai.db")
cursor = conn.cursor()

cursor.execute("""
SELECT id, vector_id, text
FROM document_chunks
""")

for row in cursor.fetchall():
    print(row)

conn.close()