"""Claude-based answer evaluator for free-form responses.

Owner: Track-5. Implements SRS 9.3. Returns:
  {correct: bool, partial_credit: float, feedback: str}
"""

from ..models import Question


async def evaluate_answer(
    question: Question,
    user_answer: str,
    monster_name: str = "the Oracle",
) -> tuple[bool, float, str]:
    raise NotImplementedError("Track-5: implement rubric-based answer eval")
