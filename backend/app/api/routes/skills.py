"""Skills graph + concept visualization routes.

Owner: Track-4 (graph state), Track-5 (Claude visualization).
"""

from fastapi import APIRouter

from ...mock_data import demo_skills_graph, demo_visualize
from ...models import SkillsGraph, VisualizeRequest, VisualizeResponse

router = APIRouter(tags=["skills"])


@router.get("/courses/{course_id}/skills", response_model=SkillsGraph)
def get_skills(course_id: str) -> SkillsGraph:
    return demo_skills_graph()


@router.post("/skills/{skill_id}/visualize", response_model=VisualizeResponse)
async def visualize(skill_id: str, body: VisualizeRequest | None = None) -> VisualizeResponse:
    # TODO (Track-5): retrieve top-k chunks from Chroma, prompt Claude for SVG + explanation, cache.
    return demo_visualize()
