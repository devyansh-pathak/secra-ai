import sqlite3

conn = sqlite3.connect("enterprise_ai.db")

cursor = conn.cursor()

cursor.execute("""
SELECT id, filename, department, classification
FROM documents
""")

rows = cursor.fetchall()

for row in rows:
    print(row)

conn.close()