"""Battle lifecycle service — stub.

Owner: Track-5 (Backend-AI). Wire up:
  1. start_battle -> call ai.battle_agent.generate_questions
  2. submit_answer -> call ai.evaluator.evaluate_answer for free-form;
     update HP using game.damage.compute_damage.
  3. finalize -> compute points via game.points.compute_points,
     update SkillMastery rows, unlock next Level.
"""

from uuid import UUID

from ..models import AnswerResponse, BattleSummary, StartBattleResponse


class BattleService:
    async def start(self, user_id: UUID, level_id: UUID) -> StartBattleResponse:
        raise NotImplementedError("Track-5: implement LangGraph battle generation")

    async def answer(
        self, battle_id: UUID, question_id: UUID, answer: str, audio_blob_b64: str | None
    ) -> AnswerResponse:
        raise NotImplementedError("Track-5: implement answer eval + HP update")

    def summary(self, battle_id: UUID) -> BattleSummary:
        raise NotImplementedError("Track-4: implement battle summary")
