"""ChromaDB client wrapper — stub.

Owner: Track-5. Embedded persistent client at settings.chroma_persist_dir.
Single collection "course_docs" with doc_id as primary key; filtering via
metadata (course_id, lecture_id, doc_type, skill_id).
"""

import chromadb
from chromadb.config import Settings

from ..config import settings

COLLECTION_NAME = "course_docs"

_client = None


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_collection():
    return get_client().get_or_create_collection(name=COLLECTION_NAME)
