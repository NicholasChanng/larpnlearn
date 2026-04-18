"""Courses & ingestion routes.

Owner: Track-5 (Backend-AI) for real ingestion; Track-4 (Backend-Game) for
CRUD. Stubs return the demo course so frontend can hit these endpoints.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from ...enums import Theme
from ...mock_data import demo_course, demo_lectures, demo_levels, demo_skills_graph
from ...models import Course, Lecture, Level, SkillsGraph

router = APIRouter(prefix="/courses", tags=["courses"])


class IngestResponse(BaseModel):
    course_id: str
    lectures: list[Lecture]
    skills_graph: SkillsGraph


class CourseDetailResponse(BaseModel):
    course: Course
    lectures: list[Lecture]
    levels: list[Level]


class ThemePatchRequest(BaseModel):
    theme: Theme


@router.post("/ingest", response_model=IngestResponse)
async def ingest_course() -> IngestResponse:
    # TODO (Track-5): implement real ingestion pipeline per SRS 9.1.
    # For MVP the demo course is pre-baked in demo_course/ — this endpoint
    # simply returns its metadata.
    c = demo_course()
    return IngestResponse(
        course_id=c.id,
        lectures=demo_lectures(),
        skills_graph=demo_skills_graph(),
    )


@router.get("", response_model=list[Course])
def list_courses() -> list[Course]:
    return [demo_course()]


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_course(course_id: str) -> CourseDetailResponse:
    return CourseDetailResponse(
        course=demo_course(),
        lectures=demo_lectures(),
        levels=demo_levels(),
    )


@router.patch("/{course_id}/theme", response_model=Course)
def patch_theme(course_id: str, body: ThemePatchRequest) -> Course:
    c = demo_course()
    c.theme = body.theme
    return c
