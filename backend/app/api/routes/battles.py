"""Battle routes.

Owner: Track-5 (Backend-AI) for question generation, answer evaluation, Whisper STT.
Stubs return canned questions from mock_data so frontend Track-2 can develop end-to-end.
"""

from uuid import UUID

from fastapi import APIRouter

from ...mock_data import (
    demo_answer_response,
    demo_battle,
    demo_battle_summary,
    demo_start_battle,
)
from ...models import (
    AnswerRequest,
    AnswerResponse,
    Battle,
    BattleSummary,
    StartBattleRequest,
    StartBattleResponse,
)

router = APIRouter(prefix="/battles", tags=["battles"])


@router.post("/start", response_model=StartBattleResponse)
async def start_battle(body: StartBattleRequest) -> StartBattleResponse:
    # TODO (Track-5): invoke LangGraph battle agent to generate question batch.
    return demo_start_battle()


@router.post("/{battle_id}/answer", response_model=AnswerResponse)
async def answer(battle_id: UUID, body: AnswerRequest) -> AnswerResponse:
    # TODO (Track-5): run Claude rubric eval for free-form; Whisper STT if audio_blob_b64.
    # Naive stub: correct iff answer matches the demo question's correct_answer.
    is_correct = body.answer.strip().lower() in {"a*", "a star"}
    return demo_answer_response(is_correct=is_correct)


@router.post("/{battle_id}/abandon", response_model=Battle)
def abandon(battle_id: UUID) -> Battle:
    return demo_battle()


@router.get("/{battle_id}/summary", response_model=BattleSummary)
def summary(battle_id: UUID) -> BattleSummary:
    return demo_battle_summary()
