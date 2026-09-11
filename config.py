import os
from agno.db.sqlite import SqliteDb

MODEL_ID = os.getenv("SECRA_MODEL","qwen2.5:7b")
db = SqliteDb(db_file="./db/secra_db")
KEEP_ALIVE = "60m"