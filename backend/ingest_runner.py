import sys
import os

from app import ingest
from app.db import init_db


def main():
    # ensure DB tables exist
    init_db()
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "worldcup2026.json")
    n = ingest.ingest_file(path)
    print(f"ingested {n} matches from {path}")


if __name__ == "__main__":
    main()
