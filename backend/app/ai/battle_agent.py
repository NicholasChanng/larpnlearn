"""RAG question-generation pipeline.

Flow (mirrors the PyPDFLoader → retriever → chain pattern from the LangChain
docs, adapted to pre-chunked CourseDocuments):

  retrieve_for_battle (tiered, Section 9.2 of SRS)
      ↓
  _format_context (group by doc_type, overviews → definitions → chunks → examples)
      ↓
  ChatPromptTemplate | ChatAnthropic.with_structured_output(_QuestionBatch)
      ↓
  list[Question]

Token budgets and tier prioritization are enforced inside retrieve_for_battle;
this module only formats, prompts, and parses.
"""

from __future__ import annotations

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from ..config import settings
from ..enums import BattleType, Difficulty, DocType, QuestionType
from ..models import CourseDocument, Question
from ..rag.retrieval import retrieve_for_battle


class _GeneratedQuestion(BaseModel):
    type: QuestionType
    difficulty: Difficulty
    prompt: str = Field(description="Question text in the monster's voice")
    options: list[str] | None = Field(
        default=None, description="Exactly 4 options for MCQ; null otherwise"
    )
    correct_answer: str = Field(
        description="For MCQ, the exact text of the correct option; otherwise the ideal answer"
    )
    rubric: str | None = Field(
        default=None, description="Grading rubric for free-form; null for MCQ"
    )
    concepts_tested: list[str] = Field(default_factory=list)
    source_lecture_id: str


class _QuestionBatch(BaseModel):
    questions: list[_GeneratedQuestion]


_QUESTION_COUNTS: dict[BattleType, int] = {
    BattleType.REGULAR: 5,
    BattleType.MIDTERM: 10,
    BattleType.FINAL: 15,
}

_DOC_TYPE_ORDER: list[DocType] = [
    DocType.LECTURE_OVERVIEW,
    DocType.EXAM_DESCRIPTION,
    DocType.CONCEPT_DEFINITION,
    DocType.CONCEPT_RELATIONSHIP,
    DocType.WORKED_EXAMPLE,
    DocType.LECTURE_SLIDE_CHUNK,
]

_SYSTEM_PROMPT = (
    "You are an expert educator designing quiz questions for a themed learning "
    "game. Questions must be technically accurate, grounded in the provided "
    "lecture context, and appropriate for an undergraduate course. Do NOT "
    "fabricate facts outside the provided context. If the context is thin on "
    "specifics, fall back to the topics listed in the LECTURE_OVERVIEW."
)

_USER_PROMPT = """Course: {course_name}
Monster: {monster_name} — speaks in a {voice_tone} voice.

Retrieved lecture context:
---
{context}
---

Generate exactly {n} questions for a {battle_type} battle.
Type distribution:
- {mcq_count} multiple_choice — exactly 4 options, one correct
- {short_count} short_answer (voice) — 1-2 sentences, include a rubric

Difficulty: mix easy / medium / hard roughly evenly.
Phrase each prompt in {monster_name}'s voice, but do NOT alter the technical content.

Constraints:
- Every `source_lecture_id` MUST be one of: {lecture_ids}.
- `concepts_tested` MUST reference topics present in the retrieved context.
- For MCQ, `correct_answer` MUST match one of the 4 `options` exactly.
"""


def _format_context(docs: list[CourseDocument]) -> str:
    groups: dict[DocType, list[str]] = {}
    for d in docs:
        groups.setdefault(d.doc_type, []).append(d.text)

    parts: list[str] = []
    for dt in _DOC_TYPE_ORDER:
        if dt in groups:
            body = "\n\n".join(groups[dt])
            parts.append(f"## {dt.value.upper()}\n{body}")
    return "\n\n".join(parts) if parts else "(no context retrieved)"


def _get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model="gpt-5-mini",
        api_key=settings.openai_api_key,
        max_tokens=4096,
        timeout=settings.generation_timeout_s,
    )


def _compute_mcq_short_counts(total_questions: int) -> tuple[int, int]:
    if total_questions <= 0:
        return 0, 0

    floor_short = total_questions // 4
    ceil_short = min(total_questions, floor_short + 1)

    def _distance_from_target(short_count: int) -> float:
        return abs((short_count / total_questions) - 0.25)

    if _distance_from_target(floor_short) <= _distance_from_target(ceil_short):
        short_count = floor_short
    else:
        short_count = ceil_short

    mcq_count = total_questions - short_count
    return mcq_count, short_count


async def generate_questions(
    course_id: str,
    lecture_ids: list[str],
    battle_type: BattleType,
    *,
    course_name: str = "this course",
    monster_name: str = "the Oracle",
    monster_voice_tone: str = "wise, cryptic, oracular",
    user_weak_concepts: list[str] | None = None,
) -> list[Question]:
    query = (
        " ".join(user_weak_concepts)
        if user_weak_concepts
        else f"key concepts from lectures {', '.join(lecture_ids)}"
    )
    context_docs = await retrieve_for_battle(course_id, lecture_ids, battle_type, query)

    n = _QUESTION_COUNTS[battle_type]
    mcq_count, short_count = _compute_mcq_short_counts(n)

    prompt = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)]
    )
    chain = prompt | _get_llm().with_structured_output(_QuestionBatch)

    batch: _QuestionBatch = await chain.ainvoke(
        {
            "course_name": course_name,
            "monster_name": monster_name,
            "voice_tone": monster_voice_tone,
            "context": _format_context(context_docs),
            "n": n,
            "battle_type": battle_type.value,
            "mcq_count": mcq_count,
            "short_count": short_count,
            "lecture_ids": ", ".join(lecture_ids),
        }
    )

    return [
        Question(
            type=q.type,
            difficulty=q.difficulty,
            prompt=q.prompt,
            options=q.options,
            correct_answer=q.correct_answer,
            rubric=q.rubric,
            concepts_tested=q.concepts_tested,
            source_lecture_id=q.source_lecture_id
            if q.source_lecture_id in lecture_ids
            else lecture_ids[0],
        )
        for q in batch.questions
    ]
