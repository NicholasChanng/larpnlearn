"""Validation agent for voice/free-form answers.

MVP contract:
  input  -> question metadata + transcribed response
  output -> (feedback, correct)
"""

from __future__ import annotations

import logging

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from ..config import settings
from ..models import QuizQuestionMetadata

logger = logging.getLogger(__name__)


class _ValidationResult(BaseModel):
    feedback: str = Field(description="Short actionable feedback in one or two sentences")
    correct: bool = Field(description="True if the response satisfies core requirements")


_SYSTEM_PROMPT = (
    "You grade short spoken student responses for correctness. "
    "Be strict about factual accuracy and whether required points are covered, "
    "but tolerant of phrasing differences."
)

_USER_PROMPT = """Question:
{question}

Expected response requirements:
{requirements}

Student response:
{student_response}

Return concise feedback and a boolean correctness decision.
"""


async def validate_voice_answer(
    student_response: str,
    question_metadata: QuizQuestionMetadata,
) -> tuple[str, bool]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for voice validation; fallback is disabled.")

    requirements = question_metadata.response_requirements or []
    prompt = ChatPromptTemplate.from_messages(
        [("system", _SYSTEM_PROMPT), ("human", _USER_PROMPT)]
    )
    chain = prompt | ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.openai_api_key,
        max_tokens=256,
        timeout=settings.generation_timeout_s,
    ).with_structured_output(_ValidationResult)

    logger.info(
        "validation_agent:invoke student_response_preview=%r requirements=%s",
        student_response[:80],
        requirements,
    )
    result: _ValidationResult = await chain.ainvoke(
        {
            "question": question_metadata.content,
            "requirements": "\n".join(f"- {r}" for r in requirements) or "- no strict list",
            "student_response": student_response,
        }
    )
    logger.info("validation_agent:result correct=%s feedback=%r", result.correct, result.feedback)
    return result.feedback, result.correct
