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
DEMO_LEVEL_IDS = [UUID(f"00000000-0000-0000-0000-0000000000{i:02x}") for i in range(1, 16)]
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


def demo_monster(name: str = "Hades", hp: int = 100, sprite: str = "/themes/greek/hades.png") -> MonsterConfig:
    return MonsterConfig(
        id="hades",
        name=name,
        sprite_path=sprite,
        hp=hp,
        attack_animation="flame_burst",
        attack_sound="/themes/greek/hades_attack.mp3",
        voice_tone="Speak with gravitas and doom, as a god of the underworld.",
    )


def demo_segments() -> list[ThemeSegment]:
    return [
        ThemeSegment(id="olympus", range=[1, 3], bg_image="/themes/greek/olympus.png", music="/themes/greek/olympus.mp3"),
        ThemeSegment(id="athens", range=[4, 6], bg_image="/themes/greek/athens.png", music="/themes/greek/athens.mp3"),
        ThemeSegment(id="aegean", range=[7, 9], bg_image="/themes/greek/aegean.png", music="/themes/greek/aegean.mp3"),
        ThemeSegment(id="island", range=[10, 12], bg_image="/themes/greek/island.png", music="/themes/greek/island.mp3"),
        ThemeSegment(id="underworld", range=[13, 15], bg_image="/themes/greek/underworld.png", music="/themes/greek/underworld.mp3"),
    ]


def demo_levels() -> list[Level]:
    levels: list[Level] = []
    for i, lid in enumerate(DEMO_LEVEL_IDS, start=1):
        is_midterm = i == 8
        is_final = i == 15
        is_exam = is_midterm or is_final
        if i == 1:
            state = LevelState.COMPLETED
        elif i == 2:
            state = LevelState.AVAILABLE
        else:
            state = LevelState.LOCKED
        segment = next(s for s in demo_segments() if s.range[0] <= i <= s.range[1])
        monster_hp = 500 if is_final else 300 if is_midterm else 100
        monster_name = "Zeus" if is_final else "Cerberus" if is_midterm else "Minor Spirit"
        levels.append(
            Level(
                id=lid,
                lecture_id=f"lec_{i:02d}" if not is_exam else ("lec_midterm_01" if is_midterm else "lec_final"),
                course_id=DEMO_COURSE_ID,
                order_index=i,
                state=state,
                theme_segment=segment.id,
                monster=demo_monster(name=monster_name, hp=monster_hp),
                is_exam=is_exam,
                exam_type=(ExamType.MIDTERM if is_midterm else ExamType.FINAL if is_final else None),
            )
        )
    return levels


def demo_world() -> WorldResponse:
    return WorldResponse(
        course_id=DEMO_COURSE_ID,
        theme=Theme.GREEK,
        levels=demo_levels(),
        current_level_id=DEMO_LEVEL_IDS[1],
        segments=demo_segments(),
    )


def demo_lectures() -> list[Lecture]:
    topics_by_lecture = [
        ["Intro to AI", "Rational agents", "PEAS"],
        ["Uninformed search", "BFS", "DFS", "UCS"],
        ["Informed search", "A*", "Heuristics"],
        ["Adversarial search", "Minimax", "Alpha-beta"],
        ["CSPs", "Backtracking", "Arc consistency"],
        ["Logic", "Propositional logic", "Resolution"],
        ["Planning", "STRIPS", "State-space"],
        ["MIDTERM"],
        ["MDPs", "Bellman equations", "Value iteration"],
        ["Reinforcement learning", "Q-learning"],
        ["Probability", "Bayes rule", "Independence"],
        ["Bayes nets", "Inference"],
        ["HMMs", "Particle filtering"],
        ["Machine learning", "Naive Bayes", "Perceptrons"],
        ["FINAL"],
    ]
    out: list[Lecture] = []
    for i, topics in enumerate(topics_by_lecture, start=1):
        is_midterm = i == 8
        is_final = i == 15
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


def demo_start_battle() -> StartBattleResponse:
    return StartBattleResponse(
        battle_id=DEMO_BATTLE_ID,
        initial_question=demo_question(),
        user_hp=30,
        monster_hp=100,
        monster=demo_monster(),
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
