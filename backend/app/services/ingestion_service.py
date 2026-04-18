"""Course ingestion service.

Owner: Track-5 (Backend-AI). Loads pre-chunked lecture JSONs from a course
directory, builds CourseDocument objects (slide chunks + lecture overviews),
embeds them in one batched OpenAI call, and upserts into ChromaDB.

Run once offline via backend/scripts/ingest_cs188.py; commit chroma_data/.
Do NOT re-ingest during the demo (NFR-PRF-04, SRS 9.1.2).
"""

import json
from pathlib import Path

import openai

from ..config import settings
from ..enums import DocType
from ..rag.chroma import upsert_documents
from ..rag.documents import build_context_header, make_document


class IngestionService:
    async def ingest_from_dir(self, course_dir: Path) -> dict:
        course = json.loads((course_dir / "course.json").read_text())
        course_id: str = course["id"]
        course_name: str = course["name"]

        lecture_files = sorted((course_dir / "lectures").glob("lec_*.json"))
        docs = []

        for lec_path in lecture_files:
            lec = json.loads(lec_path.read_text())
            lecture_id: str = lec["lecture_id"]
            order_index: int = lec["order_index"]
            title: str = lec["title"]
            topics: list[str] = lec.get("topics", [])

            # One LECTURE_OVERVIEW per lecture (Tier 1 grounding)
            overview_id = f"{course_id.replace('-', '_')}_lec_{order_index:02d}_overview"
            header = build_context_header(course_name, order_index, title)
            overview_text = f"{header} Topics: {', '.join(topics)}"
            docs.append(make_document(
                doc_id=overview_id,
                course_id=course_id,
                doc_type=DocType.LECTURE_OVERVIEW,
                text=overview_text,
                metadata={"lecture_id": lecture_id},
            ))

            # All slide chunks for this lecture
            for chunk in lec.get("chunks", []):
                docs.append(make_document(
                    doc_id=chunk["doc_id"],
                    course_id=course_id,
                    doc_type=DocType.LECTURE_SLIDE_CHUNK,
                    text=chunk["text"],
                    metadata=chunk.get("metadata", {}),
                ))

        client = openai.OpenAI(api_key=settings.openai_api_key)
        response = client.embeddings.create(
            input=[d.text for d in docs],
            model=settings.embedding_model,
        )
        embeddings = [item.embedding for item in response.data]

        upsert_documents(docs, embeddings)
        return {"ingested": len(docs)}
