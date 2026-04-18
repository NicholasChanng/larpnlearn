from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import auth, battles, courses, progress, skills, world
from .config import settings
from .db.session import init_db

API_PREFIX = "/api/v1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Aristotle API",
    description="Gamified course companion — backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(courses.router, prefix=API_PREFIX)
app.include_router(world.router, prefix=API_PREFIX)
app.include_router(battles.router, prefix=API_PREFIX)
app.include_router(skills.router, prefix=API_PREFIX)
app.include_router(progress.router, prefix=API_PREFIX)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok", "env": settings.app_env}
