"""User progress service — stub.

Owner: Track-4 (Backend-Game). Handles: points awarding, streak increment/reset,
lives reset at midnight, avatar equip/purchase.
"""

from uuid import UUID

from ..models import AvatarConfig, ProgressResponse


class ProgressService:
    def get_progress(self, user_id: UUID) -> ProgressResponse:
        raise NotImplementedError("Track-4")

    def award_points(self, user_id: UUID, points: int) -> int:
        raise NotImplementedError("Track-4")

    def increment_streak(self, user_id: UUID) -> int:
        raise NotImplementedError("Track-4")

    def reset_streak(self, user_id: UUID) -> None:
        raise NotImplementedError("Track-4")

    def equip(self, user_id: UUID, slot: str, item_id: str) -> AvatarConfig:
        raise NotImplementedError("Track-4")
