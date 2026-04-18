"""ChromaDB client wrapper.

Owner: Track-5. Embedded persistent client at settings.chroma_persist_dir.
Single collection "course_docs" with doc_id as primary key; filtering via
metadata (course_id, lecture_id, doc_type, skill_id).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import chromadb
from chromadb.config import Settings
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings

from ..config import settings

if TYPE_CHECKING:
    from ..models import CourseDocument

COLLECTION_NAME = "course_docs"

_client = None
_vectorstore = None


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


def get_vectorstore() -> Chroma:
    global _vectorstore
    if _vectorstore is None:
        embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=settings.openai_api_key,
        )
        _vectorstore = Chroma(
            client=get_client(),
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
        )
    return _vectorstore


def upsert_documents(docs: list[CourseDocument], embeddings: list[list[float]]) -> None:
    collection = get_collection()
    collection.upsert(
        ids=[d.doc_id for d in docs],
        documents=[d.text for d in docs],
        embeddings=embeddings,
        metadatas=[{"doc_id": d.doc_id, "course_id": d.course_id, "doc_type": d.doc_type, **d.metadata} for d in docs],
    )
