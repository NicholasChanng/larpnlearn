"""Tiered retrieval per SRS 9.2 — stub.

Owner: Track-5. Budget enforcement:
  Regular: 5,000 tokens | Midterm: 8,000 | Final: 15,000.
Drop from Tier 3 outward on overflow; never drop Tier 1 (overviews / exam desc).
"""

from ..enums import BattleType, DocType
from ..models import CourseDocument

TOKEN_BUDGETS: dict[BattleType, int] = {
    BattleType.REGULAR: 5_000,
    BattleType.MIDTERM: 8_000,
    BattleType.FINAL: 15_000,
}


async def retrieve_for_battle(
    course_id: str,
    lecture_ids: list[str],
    battle_type: BattleType,
    query: str,
) -> list[CourseDocument]:
    raise NotImplementedError("Track-5: implement tiered retrieval")


async def retrieve_for_visualization(
    course_id: str,
    skill_id: str,
    k: int = 5,
) -> list[CourseDocument]:
    """Prioritize CONCEPT_DEFINITION, WORKED_EXAMPLE, LECTURE_SLIDE_CHUNK."""
    raise NotImplementedError("Track-5: implement visualization retrieval")


_PRIORITY_DOC_TYPES_FOR_VIZ = [
    DocType.CONCEPT_DEFINITION,
    DocType.WORKED_EXAMPLE,
    DocType.LECTURE_SLIDE_CHUNK,
]
