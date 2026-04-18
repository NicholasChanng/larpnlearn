"""LangGraph battle-generation agent — stub.

Owner: Track-5. Implement SRS 9.2 state machine:

  retrieve_lecture_context -> determine_question_mix ->
  generate_question_batch -> validate_questions -> READY

Tiered retrieval (SRS 9.2):
  Tier 1: LECTURE_OVERVIEW + EXAM_DESCRIPTION (structural grounding)
  Tier 2: CONCEPT_DEFINITION + CONCEPT_RELATIONSHIP (top-k similarity)
  Tier 3: LECTURE_SLIDE_CHUNK (body + figure_caption) — bounded
  Tier 4: WORKED_EXAMPLE

Token budgets per NFR-PRF-04:
  Regular: 5,000 | Midterm: 8,000 | Final: 15,000
Drop from Tier 3 outward on overflow; never drop Tier 1.
"""

from ..enums import BattleType
from ..models import Question


async def generate_questions(
    course_id: str,
    lecture_ids: list[str],
    battle_type: BattleType,
    user_weak_concepts: list[str] | None = None,
) -> list[Question]:
    raise NotImplementedError("Track-5: implement LangGraph battle agent")
