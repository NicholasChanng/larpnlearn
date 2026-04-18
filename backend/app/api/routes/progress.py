"""User progress + avatar customization routes.

Owner: Track-4 (Backend-Game).
"""

from fastapi import APIRouter

from ...mock_data import demo_progress, demo_user
from ...models import (
    AvatarResponse,
    EquipRequest,
    ProgressResponse,
    PurchaseRequest,
)

router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=ProgressResponse)
def get_progress() -> ProgressResponse:
    return demo_progress()


@router.post("/avatar/equip", response_model=AvatarResponse)
def equip(body: EquipRequest) -> AvatarResponse:
    u = demo_user()
    u.avatar_config.equipped_items[body.slot] = body.item_id
    return AvatarResponse(avatar=u.avatar_config, points_remaining=u.total_points)


@router.post("/avatar/purchase", response_model=AvatarResponse)
def purchase(body: PurchaseRequest) -> AvatarResponse:
    u = demo_user()
    if body.item_id not in u.avatar_config.unlocked_items:
        u.avatar_config.unlocked_items.append(body.item_id)
    return AvatarResponse(avatar=u.avatar_config, points_remaining=max(0, u.total_points - 50))
