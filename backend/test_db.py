import asyncio
from sqlalchemy import create_engine, text
import os

if __name__ == "__main__":
    engine = create_engine("postgresql://solvai_admin:solvai_secret_2025@127.0.0.1:5434/solvai_db")
    with engine.connect() as conn:
        res = conn.execute(text("SELECT id, source_type, status FROM data_sources"))
        for row in res:
            print(row)
