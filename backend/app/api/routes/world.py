"""World / levels routes.

Owner: Track-4 (Backend-Game).
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...mock_data import demo_levels, demo_monster, demo_world
from ...models import Lecture, Level, MonsterConfig, WorldResponse
from ...mock_data import demo_lectures

router = APIRouter(tags=["world"])


class LevelDetailResponse(BaseModel):
    level: Level
    lecture: Lecture
    monster: MonsterConfig


@router.get("/courses/{course_id}/world", response_model=WorldResponse)
def get_world(course_id: str) -> WorldResponse:
    return demo_world()


@router.get("/levels/{level_id}", response_model=LevelDetailResponse)
def get_level(level_id: UUID) -> LevelDetailResponse:
    levels = demo_levels()
    level = next((l for l in levels if l.id == level_id), None)
    if level is None:
        raise HTTPException(status_code=404, detail="Level not found")
    lecture = next((l for l in demo_lectures() if l.id == level.lecture_id), None)
    if lecture is None:
        raise HTTPException(status_code=404, detail="Lecture not found")
    return LevelDetailResponse(level=level, lecture=lecture, monster=level.monster)
