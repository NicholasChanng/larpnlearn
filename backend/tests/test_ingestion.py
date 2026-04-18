import pytest
from pathlib import Path

CHROMA_DATA = Path(__file__).parent.parent / "chroma_data"


@pytest.mark.skipif(not CHROMA_DATA.exists(), reason="chroma_data/ not present — run scripts/ingest_cs188.py first")
def test_collection_count():
    from app.rag.chroma import get_collection
    col = get_collection()
    assert col.count() > 100
