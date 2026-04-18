"""Deterministic mock fixtures returned by stub API routes.

Lets the frontend develop against real HTTP before backend tracks finish.
Replace these returns with real service-layer calls as tracks land.
"""

from datetime import date, datetime, timezone
from uuid import UUID

from .enums import (
    BattleOutcome,
    Difficulty,
    ExamType,
    LevelState,
    QuestionType,
    SkillState,
    Theme,
)
from .models import (
    AnswerResponse,
    AvatarConfig,
    Battle,
    BattleSummary,
    Course,
    Lecture,
    Level,
    MonsterConfig,
    ProgressResponse,
    Question,
    QuestionAttempt,
    Skill,
    SkillEdge,
    SkillsGraph,
    StartBattleResponse,
    ThemeSegment,
    User,
    VisualizeResponse,
    WorldResponse,
)

# Stable UUIDs so mock data is deterministic across requests.
DEMO_USER_ID = UUID("11111111-1111-1111-1111-111111111111")
DEMO_LEVEL_IDS = [UUID(f"00000000-0000-0000-0000-0000000000{i:02x}") for i in range(1, 17)]
DEMO_BATTLE_ID = UUID("22222222-2222-2222-2222-222222222222")
DEMO_QUESTION_ID = UUID("33333333-3333-3333-3333-333333333333")

DEMO_COURSE_ID = "cs188-sp2024"


def demo_user() -> User:
    return User(
        id=DEMO_USER_ID,
        email="demo@aristotle.app",
        display_name="Demo Student",
        avatar_config=AvatarConfig(
            base_character="hero",
            unlocked_items=["hero", "scholar"],
            equipped_items={"body": "hero"},
        ),
        total_points=420,
        current_streak=3,
        last_streak_update=datetime.now(timezone.utc),
        lives_remaining=3,
        created_at=datetime.now(timezone.utc),
    )


def demo_course() -> Course:
    return Course(
        id=DEMO_COURSE_ID,
        user_id=DEMO_USER_ID,
        name="CS 188 — Intro to Artificial Intelligence",
        theme=Theme.GREEK,
        instructor="Prof. Demo",
        term="Spring 2024",
        description="Introduction to AI: search, MDPs, RL, probabilistic reasoning, ML.",
        total_lectures=15,
        created_at=datetime.now(timezone.utc),
    )


def demo_monster(name: str = "Hades", hp: int = 100, sprite: str = "/themes/greek/sprites/hades.png") -> MonsterConfig:
    return MonsterConfig(
        id="hades",
        name=name,
        sprite_path=sprite,
        hp=hp,
        attack_animation="flame_burst",
        attack_sound="/themes/greek/sfx/hades.mp3",
        voice_tone="Speak with gravitas and doom, as a god of the underworld.",
    )


# Deterministic mapping from level order_index to (monster_id, monster_name).
# The frontend's ThemeManifest resolves the full monster config from its
# manifest; this is just enough so the backend's StartBattleResponse carries
# a plausible name for each level. Source: Greek Odyssey roster in
# frontend/public/themes/greek/manifest.json.
_GREEK_LEVEL_MONSTERS: list[tuple[str, str, int]] = [
    ("minor_spirit", "Minor Spirit", 100),
    ("wind_nymph", "Wind Nymph", 100),
    ("apollo_oracle", "Apollo's Oracle", 100),
    ("satyr", "Satyr", 100),
    ("harpy", "Harpy", 100),
    ("minotaur", "Minotaur", 100),
    ("siren", "Siren", 100),
    ("kraken", "The Kraken", 300),  # midterm at order 8
    ("scylla", "Scylla", 100),
    ("cyclops", "Polyphemus the Cyclops", 100),
    ("medusa", "Medusa", 100),
    ("hydra", "Lernaean Hydra", 100),
    ("cerberus", "Cerberus", 100),
    ("charon", "Charon", 100),
    ("shade_achilles", "Shade of Achilles", 100),
    ("hades", "Hades, Lord of the Underworld", 500),  # final at order 16
]


def demo_monster_for_order(order: int, is_exam: bool = False, is_final: bool = False) -> MonsterConfig:
    idx = max(0, min(len(_GREEK_LEVEL_MONSTERS) - 1, order - 1))
    mid, name, hp = _GREEK_LEVEL_MONSTERS[idx]
    if is_final:
        hp = 500
    elif is_exam:
        hp = 300
    return MonsterConfig(
        id=mid,
        name=name,
        sprite_path=f"/themes/greek/sprites/{mid}.png",
        hp=hp,
        attack_animation="themed_attack",
        attack_sound=f"/themes/greek/sfx/{mid}.mp3",
        voice_tone="Speak in theme-appropriate voice.",
    )


def demo_segments() -> list[ThemeSegment]:
    # Ranges match frontend/public/themes/greek/manifest.json.
    return [
        ThemeSegment(id="olympus", range=[1, 3], bg_image="/themes/greek/bg/olympus.png", music="/themes/greek/music/olympus.mp3"),
        ThemeSegment(id="athens", range=[4, 6], bg_image="/themes/greek/bg/athens.png", music="/themes/greek/music/athens.mp3"),
        ThemeSegment(id="aegean", range=[7, 9], bg_image="/themes/greek/bg/aegean.png", music="/themes/greek/music/aegean.mp3"),
        ThemeSegment(id="island", range=[10, 12], bg_image="/themes/greek/bg/island.png", music="/themes/greek/music/island.mp3"),
        ThemeSegment(id="underworld", range=[13, 16], bg_image="/themes/greek/bg/underworld.png", music="/themes/greek/music/underworld.mp3"),
    ]


def demo_levels() -> list[Level]:
    # Midterm at order 8, final at order 16 per the Odyssey theme segments.
    levels: list[Level] = []
    for i, lid in enumerate(DEMO_LEVEL_IDS, start=1):
        is_midterm = i == 8
        is_final = i == 16 if len(DEMO_LEVEL_IDS) >= 16 else i == len(DEMO_LEVEL_IDS)
        is_exam = is_midterm or is_final
        if i <= 3:
            state = LevelState.COMPLETED
        elif i == 4:
            state = LevelState.AVAILABLE
        else:
            state = LevelState.LOCKED
        segment = next(s for s in demo_segments() if s.range[0] <= i <= s.range[1])
        levels.append(
            Level(
                id=lid,
                lecture_id=f"lec_{i:02d}" if not is_exam else ("lec_midterm_01" if is_midterm else "lec_final"),
                course_id=DEMO_COURSE_ID,
                order_index=i,
                state=state,
                theme_segment=segment.id,
                monster=demo_monster_for_order(i, is_exam=is_exam, is_final=is_final),
                is_exam=is_exam,
                exam_type=(ExamType.MIDTERM if is_midterm else ExamType.FINAL if is_final else None),
            )
        )
    return levels


def demo_world() -> WorldResponse:
    # Place current at index 3 so Olympus is completed and Athens is unlocked.
    return WorldResponse(
        course_id=DEMO_COURSE_ID,
        theme=Theme.GREEK,
        levels=demo_levels(),
        current_level_id=DEMO_LEVEL_IDS[3],
        segments=demo_segments(),
    )


def demo_lectures() -> list[Lecture]:
    # 16 slots: L1-7 regular, L8 midterm, L9-15 regular, L16 final.
    topics_by_lecture = [
        ["Intro to AI", "Rational agents", "PEAS"],
        ["Uninformed search", "BFS", "DFS", "UCS"],
        ["Informed search", "A*", "Heuristics"],
        ["CSPs", "Backtracking", "Forward checking"],
        ["CSPs II", "Arc consistency", "Local search"],
        ["Game trees", "Minimax", "Alpha-beta"],
        ["Expectimax", "Utility theory"],
        ["MIDTERM"],
        ["MDPs", "Bellman equations", "Value iteration"],
        ["Policy iteration", "Q-values"],
        ["Reinforcement learning", "TD learning"],
        ["Q-learning", "Exploration"],
        ["Probability", "Bayes rule", "Bayes nets"],
        ["Bayes nets inference", "Variable elimination"],
        ["HMMs", "Particle filtering"],
        ["FINAL"],
    ]
    out: list[Lecture] = []
    for i, topics in enumerate(topics_by_lecture, start=1):
        is_midterm = i == 8
        is_final = i == 16
        lid = "lec_midterm_01" if is_midterm else "lec_final" if is_final else f"lec_{i:02d}"
        out.append(
            Lecture(
                id=lid,
                course_id=DEMO_COURSE_ID,
                order_index=i,
                title=("Midterm" if is_midterm else "Final" if is_final else f"Lecture {i}"),
                topics=topics,
                scheduled_date=date(2024, 1, 15),
                is_exam=is_midterm or is_final,
                exam_type=(ExamType.MIDTERM if is_midterm else ExamType.FINAL if is_final else None),
                estimated_difficulty=Difficulty.MEDIUM,
            )
        )
    return out


def demo_skills_graph() -> SkillsGraph:
    skills = [
        Skill(
            id="skl_rational_agent",
            course_id=DEMO_COURSE_ID,
            name="Rational Agents",
            description="Agents that act to maximize expected utility.",
            prerequisites=[],
            taught_in_lectures=["lec_01"],
            state=SkillState.MASTERED,
            mastery_score=1.0,
        ),
        Skill(
            id="skl_bfs",
            course_id=DEMO_COURSE_ID,
            name="Breadth-First Search",
            description="Uninformed search expanding shallowest nodes first.",
            prerequisites=["skl_rational_agent"],
            taught_in_lectures=["lec_02"],
            state=SkillState.ATTEMPTED,
            mastery_score=0.5,
        ),
        Skill(
            id="skl_astar",
            course_id=DEMO_COURSE_ID,
            name="A* Search",
            description="Informed best-first search with f(n) = g(n) + h(n).",
            prerequisites=["skl_bfs"],
            taught_in_lectures=["lec_03"],
        ),
        Skill(
            id="skl_minimax",
            course_id=DEMO_COURSE_ID,
            name="Minimax",
            description="Adversarial game-tree search.",
            prerequisites=["skl_astar"],
            taught_in_lectures=["lec_04"],
        ),
        Skill(
            id="skl_mdp",
            course_id=DEMO_COURSE_ID,
            name="Markov Decision Processes",
            description="Sequential decision-making under uncertainty.",
            prerequisites=["skl_minimax"],
            taught_in_lectures=["lec_09"],
        ),
    ]
    edges = [
        SkillEdge(from_skill="skl_rational_agent", to_skill="skl_bfs"),
        SkillEdge(from_skill="skl_bfs", to_skill="skl_astar"),
        SkillEdge(from_skill="skl_astar", to_skill="skl_minimax"),
        SkillEdge(from_skill="skl_minimax", to_skill="skl_mdp"),
    ]
    return SkillsGraph(course_id=DEMO_COURSE_ID, skills=skills, edges=edges)


def demo_question() -> Question:
    return Question(
        id=DEMO_QUESTION_ID,
        type=QuestionType.MCQ,
        difficulty=Difficulty.MEDIUM,
        prompt="Mortal — which search strategy expands the node with the lowest f(n) = g(n) + h(n)?",
        options=["BFS", "DFS", "A*", "Uniform-cost search"],
        correct_answer="A*",
        concepts_tested=["skl_astar"],
        source_lecture_id="lec_03",
    )


def demo_start_battle(level_id: UUID | None = None) -> StartBattleResponse:
    # Default to the current level's monster if no id supplied.
    level = None
    if level_id is not None:
        level = next((l for l in demo_levels() if l.id == level_id), None)
    if level is None:
        level = next((l for l in demo_levels() if l.state == LevelState.AVAILABLE), demo_levels()[0])
    monster = level.monster
    if level.exam_type == ExamType.FINAL:
        user_hp, monster_hp = 100, 500
    elif level.exam_type == ExamType.MIDTERM:
        user_hp, monster_hp = 50, 300
    else:
        user_hp, monster_hp = 30, 100
    return StartBattleResponse(
        battle_id=DEMO_BATTLE_ID,
        initial_question=demo_question(),
        user_hp=user_hp,
        monster_hp=monster_hp,
        monster=monster,
    )


def demo_answer_response(is_correct: bool = True) -> AnswerResponse:
    return AnswerResponse(
        is_correct=is_correct,
        partial_credit=1.0 if is_correct else 0.0,
        feedback=("The Fates smile upon you." if is_correct else "You disappoint the gods."),
        damage_dealt=10 if is_correct else 0,
        damage_taken=0 if is_correct else 10,
        user_hp=30 if is_correct else 20,
        monster_hp=90 if is_correct else 100,
        next_question=demo_question(),
        battle_outcome=None,
    )


def demo_battle() -> Battle:
    q = demo_question()
    return Battle(
        id=DEMO_BATTLE_ID,
        level_id=DEMO_LEVEL_IDS[1],
        user_id=DEMO_USER_ID,
        started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
        outcome=BattleOutcome.WIN,
        user_hp_start=30,
        monster_hp_start=100,
        user_hp_end=20,
        monster_hp_end=0,
        questions=[
            QuestionAttempt(
                question=q,
                user_answer="A*",
                is_correct=True,
                partial_credit=1.0,
                feedback="Correct.",
                damage_dealt=10,
                damage_taken=0,
            )
        ],
        points_awarded=100,
    )


def demo_battle_summary() -> BattleSummary:
    return BattleSummary(battle=demo_battle(), missed_concepts=[])


def demo_progress() -> ProgressResponse:
    u = demo_user()
    return ProgressResponse(
        points=u.total_points,
        streak=u.current_streak,
        lives=u.lives_remaining,
        avatar=u.avatar_config,
        recent_battles=[demo_battle()],
    )


def demo_visualize() -> VisualizeResponse:
    return VisualizeResponse(
        svg_or_image_url=None,
        explanation=(
            "A* search combines actual cost g(n) from start with heuristic h(n) to goal. "
            "When h is admissible (never overestimates), A* is optimal."
        ),
    )
