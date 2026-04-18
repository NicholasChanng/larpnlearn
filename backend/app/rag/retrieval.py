"""Tiered retrieval per SRS 9.2.

Budget enforcement:
  Regular: 5,000 tokens | Midterm: 8,000 | Final: 15,000.
Drop from Tier 3 outward on overflow; never drop Tier 1 (overviews).
"""

from langchain_core.documents import Document as LCDocument

from ..enums import BattleType, DocType
from ..models import CourseDocument
from .chroma import get_collection, get_vectorstore

TOKEN_BUDGETS: dict[BattleType, int] = {
    BattleType.REGULAR: 5_000,
    BattleType.MIDTERM: 8_000,
    BattleType.FINAL: 15_000,
}

_PRIORITY_DOC_TYPES_FOR_VIZ = [
    DocType.CONCEPT_DEFINITION,
    DocType.WORKED_EXAMPLE,
    DocType.LECTURE_SLIDE_CHUNK,
]


def _estimate_tokens(text: str) -> int:
    return int(len(text.split()) * 1.3)


def _lc_to_course_doc(doc: LCDocument) -> CourseDocument:
    m = doc.metadata
    return CourseDocument(
        doc_id=m.get("doc_id", ""),
        course_id=m["course_id"],
        doc_type=DocType(m["doc_type"]),
        text=doc.page_content,
        metadata={k: v for k, v in m.items() if k not in ("doc_id", "course_id", "doc_type")},
    )


def _get_to_docs(result) -> list[CourseDocument]:
    ids = result.get("ids") or []
    docs = result.get("documents") or []
    metas = result.get("metadatas") or []
    return [
        CourseDocument(
            doc_id=m.get("doc_id", i),
            course_id=m["course_id"],
            doc_type=DocType(m["doc_type"]),
            text=t,
            metadata={k: v for k, v in m.items() if k not in ("doc_id", "course_id", "doc_type")},
        )
        for i, t, m in zip(ids, docs, metas)
    ]


async def retrieve_for_battle(
    course_id: str,
    lecture_ids: list[str],
    battle_type: BattleType,
    query: str,
) -> list[CourseDocument]:
    col = get_collection()
    vs = get_vectorstore()
    budget = TOKEN_BUDGETS[battle_type]

    # Tier 1 — LECTURE_OVERVIEW, metadata filter only (always included)
    t1 = _get_to_docs(col.get(
        where={"$and": [
            {"course_id": {"$eq": course_id}},
            {"doc_type": {"$eq": DocType.LECTURE_OVERVIEW.value}},
            {"lecture_id": {"$in": lecture_ids}},
        ]},
        include=["documents", "metadatas"],
    ))

    # Tier 2 — CONCEPT_DEFINITION, top-8 similarity
    try:
        t2_lc = await vs.asimilarity_search(
            query, k=8,
            filter={"$and": [
                {"course_id": {"$eq": course_id}},
                {"doc_type": {"$eq": DocType.CONCEPT_DEFINITION.value}},
                {"lecture_id": {"$in": lecture_ids}},
            ]},
        )
        t2 = [_lc_to_course_doc(d) for d in t2_lc]
    except Exception:
        t2 = []

    # Tier 3 — LECTURE_SLIDE_CHUNK, fetch top-50 then trim to budget
    try:
        t3_lc = await vs.asimilarity_search(
            query, k=50,
            filter={"$and": [
                {"course_id": {"$eq": course_id}},
                {"doc_type": {"$eq": DocType.LECTURE_SLIDE_CHUNK.value}},
                {"lecture_id": {"$in": lecture_ids}},
            ]},
        )
        t3_candidates = [_lc_to_course_doc(d) for d in t3_lc]
    except Exception:
        t3_candidates = []

    tokens_used = sum(_estimate_tokens(d.text) for d in t1 + t2)
    t3: list[CourseDocument] = []
    remaining = budget - tokens_used
    for doc in t3_candidates:
        cost = _estimate_tokens(doc.text)
        if cost <= remaining:
            t3.append(doc)
            remaining -= cost

    return t1 + t2 + t3


async def retrieve_for_visualization(
    course_id: str,
    skill_id: str,
    k: int = 5,
) -> list[CourseDocument]:
    """Prioritize CONCEPT_DEFINITION, WORKED_EXAMPLE, LECTURE_SLIDE_CHUNK."""
    vs = get_vectorstore()
    results: list[CourseDocument] = []

    for doc_type in _PRIORITY_DOC_TYPES_FOR_VIZ:
        if len(results) >= k:
            break
        needed = k - len(results)
        try:
            lc_docs = await vs.asimilarity_search(
                skill_id, k=needed,
                filter={"$and": [
                    {"course_id": {"$eq": course_id}},
                    {"doc_type": {"$eq": doc_type.value}},
                    {"skill_id": {"$eq": skill_id}},
                ]},
            )
            results.extend(_lc_to_course_doc(d) for d in lc_docs)
        except Exception:
            continue

    return results[:k]
