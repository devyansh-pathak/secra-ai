import sqlite3

conn = sqlite3.connect("enterprise_ai.db")
cursor = conn.cursor()

cursor.execute("""
PRAGMA table_info(document_chunks)
""")

for row in cursor.fetchall():
    print(row)

conn.close()