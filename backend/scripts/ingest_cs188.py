#!/usr/bin/env python3
"""CLI entry point to ingest the cs188 course into ChromaDB.

Run from backend/: python scripts/ingest_cs188.py
Requires OPENAI_API_KEY in environment or backend/.env.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from app.services.ingestion_service import IngestionService


async def main() -> None:
    course_dir = Path(__file__).parent.parent.parent / "cs188"
    if not course_dir.exists():
        print(f"ERROR: course dir not found at {course_dir}", file=sys.stderr)
        sys.exit(1)

    svc = IngestionService()
    result = await svc.ingest_from_dir(course_dir)
    print(f"Ingested {result['ingested']} docs")


asyncio.run(main())
