import pytest
from pathlib import Path

CHROMA_DATA = Path(__file__).parent.parent / "chroma_data"


@pytest.mark.skipif(not CHROMA_DATA.exists(), reason="chroma_data/ not present — run scripts/ingest_cs188.py first")
async def test_retrieve_for_battle_returns_nonempty():
    from app.rag.retrieval import retrieve_for_battle
    from app.enums import BattleType
    from app.models import CourseDocument

    docs = await retrieve_for_battle("cs188-fall-2025", ["lec_01"], BattleType.REGULAR, "search")

    assert isinstance(docs, list)
    assert len(docs) > 0
    assert all(isinstance(d, CourseDocument) for d in docs)


@pytest.mark.skipif(not CHROMA_DATA.exists(), reason="chroma_data/ not present — run scripts/ingest_cs188.py first")
async def test_retrieve_for_battle_respects_budget():
    from app.rag.retrieval import retrieve_for_battle, TOKEN_BUDGETS, _estimate_tokens
    from app.enums import BattleType, DocType

    docs = await retrieve_for_battle("cs188-fall-2025", ["lec_01"], BattleType.REGULAR, "search")

    budget = TOKEN_BUDGETS[BattleType.REGULAR]
    t3_tokens = sum(_estimate_tokens(d.text) for d in docs if d.doc_type == DocType.LECTURE_SLIDE_CHUNK)
    non_t3_tokens = sum(_estimate_tokens(d.text) for d in docs if d.doc_type != DocType.LECTURE_SLIDE_CHUNK)
    assert non_t3_tokens + t3_tokens <= budget or t3_tokens == 0


@pytest.mark.skipif(not CHROMA_DATA.exists(), reason="chroma_data/ not present — run scripts/ingest_cs188.py first")
async def test_retrieve_for_visualization_returns_list():
    from app.rag.retrieval import retrieve_for_visualization
    from app.models import CourseDocument

    docs = await retrieve_for_visualization("cs188-fall-2025", "skl_search", k=5)

    assert isinstance(docs, list)
    assert all(isinstance(d, CourseDocument) for d in docs)
