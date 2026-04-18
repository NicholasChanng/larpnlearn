"""SQLModel persistence tables.

Only transactional state lives here (per SRS 7.4.4):
    - User progress (points, streak, lives, avatar)
    - Battle attempts and question attempts
    - Level unlock status

Course content (Course, Lecture, Skill, SkillsGraph) is sourced from the
on-disk course package + ChromaDB, not SQL. The rationale: course content
is read-only immutable fixture data; SQL is for things that mutate per user.

Track-4 (Backend-Game) owner: flesh this out as needed. Starting minimal.
"""

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class UserTable(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    display_name: str
    avatar_config_json: str = "{}"
    total_points: int = 0
    current_streak: int = 0
    last_streak_update: datetime | None = None
    lives_remaining: int = 3
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LevelStateTable(SQLModel, table=True):
    __tablename__ = "level_states"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(index=True)
    course_id: str = Field(index=True)
    lecture_id: str = Field(index=True)
    state: str = "locked"  # LevelState enum value
    best_score: int | None = None


class BattleTable(SQLModel, table=True):
    __tablename__ = "battles"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(index=True)
    level_id: UUID = Field(index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: datetime | None = None
    outcome: str | None = None  # BattleOutcome enum value
    user_hp_start: int
    monster_hp_start: int
    user_hp_end: int
    monster_hp_end: int
    points_awarded: int = 0
    questions_json: str = "[]"  # serialized list[QuestionAttempt]


class SkillMasteryTable(SQLModel, table=True):
    __tablename__ = "skill_mastery"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(index=True)
    course_id: str = Field(index=True)
    skill_id: str = Field(index=True)
    state: str = "locked"  # SkillState enum value
    mastery_score: float = 0.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)
