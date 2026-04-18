"""Course ingestion service — stub.

Owner: Track-5 (Backend-AI). Implements SRS 9.1:
  1. Load demo_course/ manifest + schedule + skills_graph + slides.
  2. For each slide PDF: extract text, chunk (~500 tokens, 50 overlap),
     extract + caption images with Claude vision.
  3. Emit CourseDocument instances per SRS 7.4 doc type table.
  4. Embed each doc.text via OpenAI embeddings.
  5. Persist to Chroma (text + metadata + doc_id) and SQL (structural state).

For the demo: run this ONCE offline and commit chroma_data/. Do NOT re-ingest
during the demo per NFR-PRF-04 and Section 9.1.2.
"""

from pathlib import Path


class IngestionService:
    async def ingest_from_dir(self, course_dir: Path) -> dict:
        raise NotImplementedError("Track-5: implement ingestion pipeline per SRS 9.1")
