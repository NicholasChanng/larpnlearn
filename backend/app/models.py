"""Pydantic API schemas.

Mirror of Section 7.1 of the SRS. These are the wire formats returned by the
FastAPI routes. Persistence tables (SQLModel) live in app/db/tables.py and may
diverge in shape but map 1-1 to these via the service layer.

Frontend types in frontend/lib/types.ts should match this file exactly —
any change here requires a matching change there.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from .enums import (
    BattleOutcome,
    Difficulty,
    DocType,
    ExamType,
    LevelState,
    QuestionType,
    SkillState,
    Theme,
)


# ---------- Avatar ----------

class AvatarConfig(BaseModel):
    base_character: str
    unlocked_items: list[str] = Field(default_factory=list)
    equipped_items: dict[str, str] = Field(default_factory=dict)


# ---------- User ----------

class User(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_config: AvatarConfig
    total_points: int = 0
    current_streak: int = 0
    last_streak_update: datetime | None = None
    lives_remaining: int = 3
    created_at: datetime


# ---------- Skills ----------

class Skill(BaseModel):
    id: str  # string skill_id like "skl_big_o" for readability
    course_id: str
    name: str
    description: str
    prerequisites: list[str] = Field(default_factory=list)
    taught_in_lectures: list[str] = Field(default_factory=list)
    state: SkillState = SkillState.LOCKED
    mastery_score: float = 0.0


class SkillEdge(BaseModel):
    from_skill: str
    to_skill: str


class SkillsGraph(BaseModel):
    course_id: str
    skills: list[Skill]
    edges: list[SkillEdge]


# ---------- Course / Lecture ----------

class Lecture(BaseModel):
    id: str
    course_id: str
    order_index: int
    title: str
    topics: list[str] = Field(default_factory=list)
    scheduled_date: date
    is_exam: bool = False
    exam_type: ExamType | None = None
    covers_lectures: list[str] | None = None
    estimated_difficulty: Difficulty | None = None


class Course(BaseModel):
    id: str
    user_id: UUID | None = None
    name: str
    theme: Theme
    instructor: str | None = None
    term: str | None = None
    description: str | None = None
    total_lectures: int
    created_at: datetime


# ---------- Theme / Monster ----------

class MonsterConfig(BaseModel):
    id: str
    name: str
    sprite_path: str
    hp: int
    attack_animation: str
    attack_sound: str | None = None
    voice_tone: str


class ThemeSegment(BaseModel):
    id: str
    range: list[int]  # [start_lecture_index, end_lecture_index] inclusive
    bg_image: str
    music: str


class ThemeAvatar(BaseModel):
    id: str
    sprite: str
    attack_anim: str


class ThemeManifest(BaseModel):
    theme_id: Theme
    display_name: str
    segments: list[ThemeSegment]
    monsters: list[MonsterConfig]
    avatars: list[ThemeAvatar]
    voice_tone_prompt: str


# ---------- Level ----------

class Level(BaseModel):
    id: UUID
    lecture_id: str
    course_id: str
    order_index: int
    state: LevelState
    theme_segment: str
    monster: MonsterConfig
    best_score: int | None = None
    is_exam: bool = False
    exam_type: ExamType | None = None


# ---------- Question / Battle ----------

class Question(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    type: QuestionType
    difficulty: Difficulty
    prompt: str
    options: list[str] | None = None
    correct_answer: str
    rubric: str | None = None
    concepts_tested: list[str] = Field(default_factory=list)
    source_lecture_id: str


class QuestionAttempt(BaseModel):
    question: Question
    user_answer: str
    is_correct: bool
    partial_credit: float = 0.0
    feedback: str = ""
    damage_dealt: int = 0
    damage_taken: int = 0


class Battle(BaseModel):
    id: UUID
    level_id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: datetime | None = None
    outcome: BattleOutcome | None = None
    user_hp_start: int
    monster_hp_start: int
    user_hp_end: int
    monster_hp_end: int
    questions: list[QuestionAttempt] = Field(default_factory=list)
    points_awarded: int = 0


# ---------- RAG ----------

class CourseDocument(BaseModel):
    doc_id: str
    course_id: str
    doc_type: DocType
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)


# ---------- API request/response envelopes ----------

class StartBattleRequest(BaseModel):
    level_id: UUID


class StartBattleResponse(BaseModel):
    battle_id: UUID
    initial_question: Question
    user_hp: int
    monster_hp: int
    monster: MonsterConfig


class AnswerRequest(BaseModel):
    question_id: UUID
    answer: str
    audio_blob_b64: str | None = None  # optional base64 audio for spoken answers


class AnswerResponse(BaseModel):
    is_correct: bool
    partial_credit: float
    feedback: str
    damage_dealt: int
    damage_taken: int
    user_hp: int
    monster_hp: int
    next_question: Question | None = None
    battle_outcome: BattleOutcome | None = None


class BattleSummary(BaseModel):
    battle: Battle
    missed_concepts: list[Skill]


class WorldResponse(BaseModel):
    course_id: str
    theme: Theme
    levels: list[Level]
    current_level_id: UUID | None
    segments: list[ThemeSegment]


class ProgressResponse(BaseModel):
    points: int
    streak: int
    lives: int
    avatar: AvatarConfig
    recent_battles: list[Battle] = Field(default_factory=list)


class VisualizeRequest(BaseModel):
    concept_id: str | None = None


class VisualizeResponse(BaseModel):
    svg_or_image_url: str | None
    explanation: str


class EquipRequest(BaseModel):
    slot: str
    item_id: str


class PurchaseRequest(BaseModel):
    item_id: str


class AvatarResponse(BaseModel):
    avatar: AvatarConfig
    points_remaining: int
