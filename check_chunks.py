import sqlite3

conn = sqlite3.connect("enterprise_ai.db")

cursor = conn.cursor()

cursor.execute("""
SELECT chunk_index, text
FROM document_chunks
""")

rows = cursor.fetchall()

for row in rows:
    print(row)

conn.close()