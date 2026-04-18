# Software Requirements Specification (SRS)

## Aristotle — Gamified Course Companion

**Version 1.0 | HackPrinceton 2026 | Education Track**

_Prepared in accordance with IEEE Std 830-1998 guidelines, adapted for hackathon scope._

---

## Table of Contents

1. Introduction
2. Overall Description
3. System Architecture
4. External Interface Requirements
5. Functional Requirements
6. Non-Functional Requirements
7. Data Model
8. API Specification
9. AI / RAG Subsystem Specification
10. Game Logic Specification
11. Theming Specification
12. Implementation Plan & Milestones
13. Appendices

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for **Aristotle**, a gamified learning companion web application that transforms college courses into interactive, game-like journeys. The document serves as the authoritative reference for the development team and any AI coding agents contributing to implementation.

### 1.2 Scope

Aristotle ingests a student's Canvas course data (syllabus, schedule, lecture slides) and procedurally generates a themed, level-based gameplay experience where each lecture becomes a "level" containing a "battle" — an AI-generated quiz gated by gameplay mechanics (HP, lives, streaks, points). A dynamically generated skills knowledge graph visualizes concept mastery.

**In scope for MVP:**

- Course ingestion via mock Canvas data (pre-seeded JSON/PDFs)
- AI-generated battles (MCQ, spoken concept check, pseudocode, math)
- Battle combat loop (HP, damage, win/lose states)
- Skills knowledge graph (DAG) with unlock states
- Three UI themes (Mario, Pokémon, Greek Mythology)
- Points, streaks, basic avatar customization
- Single-user mode (no multiplayer/leaderboards)

**Out of scope:**

- Real Canvas OAuth (deferred to post-MVP; use mock data)
- Persistent leaderboards
- Avatar marketplace economy beyond basic skin unlocks
- Mobile native apps

### 1.3 Definitions, Acronyms, and Abbreviations

| Term              | Definition                                                     |
| ----------------- | -------------------------------------------------------------- |
| Course            | A full academic course (e.g., CS 101) ingested into the system |
| World             | The visual path of levels representing an entire course        |
| Lecture           | A single day/topic within a course                             |
| Level             | A gameplay node corresponding to one lecture                   |
| Battle            | The quiz/combat encounter within a level                       |
| Monster / Villain | The AI-controlled adversary in a battle                        |
| Skill             | A single concept/topic node in the knowledge graph             |
| Skills Graph      | The DAG of all concepts in a course                            |
| HP                | Hit Points — health value for avatar and monster               |
| RAG               | Retrieval-Augmented Generation                                 |
| DAG               | Directed Acyclic Graph                                         |
| LLM               | Large Language Model (Claude via Anthropic API)                |
| STT               | Speech-to-Text (for spoken concept checks)                     |

### 1.4 References

- IEEE Std 830-1998: Recommended Practice for Software Requirements Specifications
- Anthropic Claude API documentation
- LangChain / LangGraph documentation
- ChromaDB documentation
- Next.js 14+ App Router documentation

### 1.5 Overview

Section 2 describes the system at a high level. Section 3 defines the technical architecture. Sections 4–6 contain traditional IEEE requirements breakdowns. Sections 7–11 provide implementation-ready specifications for data models, APIs, AI subsystems, game logic, and theming. Section 12 provides the hackathon milestone plan.

---

## 2. Overall Description

### 2.1 Product Perspective

Aristotle is a standalone web application with a Next.js frontend and a Python FastAPI backend. It integrates with Anthropic's Claude API for content generation and ChromaDB for vector retrieval. It depends on pre-ingested course artifacts (syllabus, lecture slides) rather than live Canvas integration in MVP.

### 2.2 Product Functions

At the highest level, Aristotle performs:

1. **Course Ingestion** — Parses syllabus, schedule, and lecture slides; extracts concepts; builds the skills graph; seeds the vector store.
2. **World Generation** — Renders a themed linear path of levels mapped to lectures, with midterm/final boss levels at appropriate points.
3. **Battle Generation** — For each battle, retrieves lecture-specific context via RAG and generates themed questions calibrated to the lecture's difficulty.
4. **Battle Execution** — Runs the turn-based combat loop, evaluates answers, updates HP, and plays animations.
5. **Progress Tracking** — Updates skills graph coloration, awards points, maintains streaks, manages lives.
6. **Post-Battle Review** — Summarizes missed topics and offers visualizations via Claude.

### 2.3 User Classes and Characteristics

- **Primary: Undergraduate Student** — Age 18–22, logs in to stay consistent with coursework, has moderate tech literacy, uses Canvas daily.
- **Secondary (future): Professor** — Configures course content; not a focus for MVP.

### 2.4 Operating Environment

- **Client:** Modern desktop browsers (Chrome, Firefox, Safari — latest versions). Minimum viewport 1280×720.
- **Server:** Linux host (Render, Railway, or Vercel). Python 3.11+, Node.js 20+.
- **External Services:** Anthropic Claude API, ChromaDB (local embedded or Chroma Cloud), optional OpenAI Whisper API for STT.

### 2.5 Design and Implementation Constraints

- Hackathon timeline (~24–36 hours) constrains feature depth.
- All LLM calls must have timeout fallbacks (5s for retrieval, 15s for generation).
- Budget: Anthropic API token usage must be cached aggressively to avoid cost spikes during demo.
- Single-player only — no real-time multiplayer infrastructure.

### 2.6 Assumptions and Dependencies

- Canvas course artifacts are available as PDFs/JSON at ingest time.
- The demo course will be pre-seeded (e.g., CS 3000 Algorithms or a simple subject the judges can recognize).
- Users have working microphones for spoken concept checks (otherwise fallback to text).
- Internet connectivity during demo is stable.

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js 14)                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │World View  │  │Battle View │  │Skills Graph│            │
│  │(Map + Path)│  │(Combat UI) │  │(D3 DAG)    │            │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘            │
│         │               │                │                   │
│         └───────────────┴────────────────┘                   │
│                         │                                    │
│                  [REST API Client]                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS / JSON
┌─────────────────────────┴───────────────────────────────────┐
│                    SERVER (FastAPI)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            API Routes (battle, world, skills)         │  │
│  └──────┬──────────────────────────┬────────────────────┘  │
│         │                          │                         │
│  ┌──────▼────────┐         ┌──────▼─────────┐              │
│  │  Game Engine  │         │  AI Orchestr.  │              │
│  │  (state mgmt) │         │  (LangGraph)   │              │
│  └──────┬────────┘         └──────┬─────────┘              │
│         │                         │                          │
│  ┌──────▼──────┐          ┌──────▼──────┐                  │
│  │  Postgres   │          │  ChromaDB   │                  │
│  │  (or SQLite)│          │  (vectors)  │                  │
│  └─────────────┘          └──────┬──────┘                  │
└────────────────────────────────────┼────────────────────────┘
                                     │
                              ┌──────▼──────┐
                              │ Claude API  │
                              │ Whisper API │
                              └─────────────┘
```

### 3.2 Technology Stack

| Layer                | Technology                           | Rationale                                               |
| -------------------- | ------------------------------------ | ------------------------------------------------------- |
| Frontend Framework   | Next.js 14 (App Router)              | Full-stack React, server actions, easy deploy to Vercel |
| UI Styling           | Tailwind CSS + shadcn/ui             | Fast hackathon styling                                  |
| Game UI / Animations | Framer Motion + Canvas/Pixi.js       | Battle animations, sprite rendering                     |
| Graph Viz            | D3.js or React Flow                  | Skills DAG rendering                                    |
| State Management     | Zustand                              | Lightweight client state                                |
| Backend Framework    | FastAPI (Python 3.11)                | Async, Pydantic validation, fast to ship                |
| AI Orchestration     | LangChain + LangGraph                | Agent workflows for battle generation                   |
| Vector Store         | ChromaDB (embedded)                  | Zero-config RAG for demo                                |
| LLM                  | Claude Sonnet 4 (via Anthropic API)  | Best quality/latency for generation                     |
| STT                  | OpenAI Whisper API                   | Short utterance transcription                           |
| Database             | SQLite (dev) / Postgres (prod)       | Simple persistence for user state                       |
| Deployment           | Vercel (frontend) + Render (backend) | Free tier, fast deploys                                 |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

#### 4.1.1 World View (Home)

- Full-screen themed backdrop (e.g., Olympus for Greek theme).
- Winding path of level nodes from bottom-left to top-right.
- Current level marked by the avatar sprite, standing on the node.
- Completed levels visually distinct (e.g., flag planted, lit torch).
- Locked levels grayed out with chain/lock icon.
- Midterm/final nodes visually distinct (larger sprites, different color aura).
- **Top bar:** streak counter, points, lives (hearts), current world name.
- **Bottom-right panel:** collapsible Skills Graph preview.
- **Top-right:** avatar customization button, theme switcher, settings.

#### 4.1.2 Battle View

- Split screen: user avatar on left, monster on right.
- HP bars above each combatant.
- Themed background (e.g., Underworld for Hades battle).
- Question rendered as speech bubble from monster.
- Answer input area below (dynamic: radio buttons for MCQ, text area for code, mic button for voice, math input for equations).
- "Attack" button to submit answer.
- Animation layer triggers sprite attack animations and damage numbers on answer submission.
- On defeat: modal with list of missed topics, each clickable to open Claude-generated explanation.

#### 4.1.3 Skills Graph View

- Full-screen DAG rendering.
- Nodes colored by mastery state: gray (locked), blue (attempted), gold (mastered).
- Hover: show concept name and brief description.
- Click: open side panel with concept summary, visualizations, worked examples.
- "Visualize this" button triggers Claude to generate an SVG/image explanation.

### 4.2 Hardware Interfaces

- Microphone access (via `navigator.mediaDevices.getUserMedia`) for spoken concept checks.
- Keyboard input for text/math answers.

### 4.3 Software Interfaces

| Interface       | Direction          | Protocol        | Purpose                           |
| --------------- | ------------------ | --------------- | --------------------------------- |
| Anthropic API   | Backend → External | HTTPS/JSON      | Question generation, explanations |
| Whisper API     | Backend → External | HTTPS/multipart | Speech-to-text for voice answers  |
| ChromaDB        | Backend ↔ Local    | Python SDK      | Vector retrieval of course chunks |
| SQLite/Postgres | Backend ↔ Local    | SQL             | User progress, course metadata    |

### 4.4 Communications Interfaces

- REST over HTTPS between Next.js client and FastAPI backend.
- WebSocket (optional, stretch goal) for real-time battle state sync.

---

## 5. Functional Requirements

Requirements are grouped by feature module. Each requirement has a unique ID for traceability.

### 5.1 Course Ingestion (FR-ING)

- **FR-ING-01:** The system shall accept a course package consisting of syllabus (PDF/text), schedule (JSON or parsed from syllabus), and lecture slides (one PDF per lecture).
- **FR-ING-02:** The system shall parse lecture slides into text chunks (~500 tokens each with 50-token overlap) and store them in ChromaDB indexed by `course_id` and `lecture_id`.
- **FR-ING-03:** The system shall extract the list of lectures and their topics from the syllabus/schedule.
- **FR-ING-04:** The system shall identify exam dates (midterms, finals) and mark their positions in the level path.
- **FR-ING-05:** The system shall generate a Skills Graph (DAG) by prompting Claude with all course material and requesting a structured concept dependency graph.
- **FR-ING-06:** Ingestion shall complete in under 60 seconds for a course with ≤15 lectures.

### 5.2 World / Map (FR-WLD)

- **FR-WLD-01:** The system shall render a linear path of level nodes, one per lecture, in chronological order.
- **FR-WLD-02:** The path shall visually distinguish: locked, current, completed, midterm, and final levels.
- **FR-WLD-03:** The avatar sprite shall be positioned on the node corresponding to the user's current lecture.
- **FR-WLD-04:** Clicking a completed or current level opens the Battle View for that level.
- **FR-WLD-05:** Clicking a locked level shows a tooltip indicating prerequisite completion needed.
- **FR-WLD-06:** The world shall render in the selected theme (Mario, Pokémon, or Greek Mythology), with thematic background segments changing every 2–3 levels.

### 5.3 Battle System (FR-BTL)

- **FR-BTL-01:** Each battle shall consist of a sequence of questions generated by the AI based on the associated lecture's content.
- **FR-BTL-02:** The user avatar shall have HP (default: 30 for regular battles, 50 for midterms, 100 for finals).
- **FR-BTL-03:** The monster shall have HP (default: 100 for regular battles, 300 for midterms, 500 for finals).
- **FR-BTL-04:** Correct answers shall deal 10 HP damage to the monster (scaled by question difficulty: easy=5, medium=10, hard=15).
- **FR-BTL-05:** Incorrect answers shall deal 10 HP damage to the user (scaled by question difficulty in the same ratio).
- **FR-BTL-06:** Question types shall include: Multiple Choice (MCQ), Spoken Concept Check (voice), Pseudocode Writing, Math Solve, Short Answer.
- **FR-BTL-07:** Each battle shall randomize question type distribution: ~50% MCQ, ~20% Spoken, ~15% Pseudocode, ~15% Math/Short Answer (configurable per course subject).
- **FR-BTL-08:** The system shall evaluate free-form answers (spoken, pseudocode, math) using Claude with a structured rubric prompt returning `{correct: bool, partial_credit: float, feedback: string}`.
- **FR-BTL-09:** On battle victory, the user shall receive points, the associated lecture's concepts shall be marked mastered in the Skills Graph, and the next level unlocks.
- **FR-BTL-10:** On battle defeat, the user loses a life; after 3 defeats in one battle, the user's streak resets.
- **FR-BTL-11:** After any battle defeat, the system shall display a summary of missed topics with a "Visualize this" button per topic.
- **FR-BTL-12:** Battle animations shall play on each attack: user-attack sprite animation + themed monster reaction (e.g., Charizard fire breath, Zeus lightning, Hades flame burst).

### 5.4 Skills Graph (FR-SKL)

- **FR-SKL-01:** The Skills Graph shall be a DAG where nodes are concepts and edges represent prerequisite relationships.
- **FR-SKL-02:** The graph layout shall use a hierarchical layout (foundational concepts at bottom, advanced at top).
- **FR-SKL-03:** Each node shall have a state: `locked | attempted | mastered`, visually distinguishable.
- **FR-SKL-04:** Mastery state updates in response to battle outcomes (mastered on full correct completion; attempted on partial).
- **FR-SKL-05:** Clicking a node opens a detail panel with: concept name, short summary, 1–2 worked examples, optional visualization.
- **FR-SKL-06:** The detail panel shall include a "Visualize this" button that triggers Claude to return an SVG or image rendering of the concept.

### 5.5 Points, Streaks, Lives (FR-PTS)

- **FR-PTS-01:** The user shall earn points per battle won: base 100, multiplied by current streak (streak × 0.1 + 1, capped at 3.0×).
- **FR-PTS-02:** Streak increments daily when the user completes the post-lecture battle before the next lecture begins.
- **FR-PTS-03:** Streak resets if: (a) user dies 3 times in one battle, or (b) user misses the post-lecture battle deadline.
- **FR-PTS-04:** Users begin with 3 lives per day; lives regenerate at midnight local time.
- **FR-PTS-05:** Lives are consumed only on battle defeat, not on wrong answers within a battle.

### 5.6 Avatar Customization (FR-AVT)

- **FR-AVT-01:** Users shall select a base avatar from a theme-specific roster (e.g., Mario/Luigi/Peach; Pikachu/Charmander/Squirtle; Hero/Heroine/Scholar).
- **FR-AVT-02:** Users shall unlock cosmetic items (hats, outfits) by spending points.
- **FR-AVT-03:** Avatar appearance persists across sessions.

### 5.7 Theming (FR-THM)

- **FR-THM-01:** Users shall select one of three themes per course: Mario, Pokémon, Greek Mythology.
- **FR-THM-02:** Theme affects: UI visuals, background music, sound effects, monster roster, animations, and question flavor text — but NOT question content accuracy.
- **FR-THM-03:** Background music shall loop per world and change per segment.
- **FR-THM-04:** Sound effects shall trigger on: correct answer (thematic success), wrong answer (thematic fail), victory, defeat.

### 5.8 Post-Battle Review (FR-PBR)

- **FR-PBR-01:** After a battle (win or loss), the system shall display a summary screen listing each question asked, user's answer, correct answer, and pass/fail.
- **FR-PBR-02:** For each missed question, the user shall be able to click "Explain" to receive a Claude-generated explanation grounded in the lecture content via RAG.
- **FR-PBR-03:** Missed concepts shall be logged to the user's weakness profile for use in future battle generation (prioritize re-testing weak concepts).

---

## 6. Non-Functional Requirements

### 6.1 Performance

- **NFR-PRF-01:** Battle question generation shall complete in ≤4 seconds P95.
- **NFR-PRF-02:** World view shall render in ≤2 seconds on initial load.
- **NFR-PRF-03:** Skills graph shall render smoothly for up to 100 nodes.
- **NFR-PRF-04:** Total retrieved context passed to the LLM for battle generation SHALL NOT exceed 5,000 tokens for regular battles, 8,000 tokens for midterm battles, and 15,000 tokens for final battles. Context beyond these limits degrades question quality ("lost in the middle" effect) and increases cost and prefill latency disproportionately. The retrieval system MUST enforce these budgets via tiered retrieval (see Section 9.2).

### 6.2 Reliability

- **NFR-REL-01:** LLM calls shall have retry logic (3 attempts with exponential backoff).
- **NFR-REL-02:** Cached question banks shall be used as fallback if LLM generation fails.

### 6.3 Usability

- **NFR-USA-01:** First-time users shall be able to start their first battle in ≤60 seconds from login.
- **NFR-USA-02:** All primary actions shall be accessible within 2 clicks from the World View.

### 6.4 Security

- **NFR-SEC-01:** Anthropic API keys shall be stored in environment variables, never exposed to the client.
- **NFR-SEC-02:** All client → server calls shall go through authenticated endpoints (JWT in Authorization header).

### 6.5 Maintainability

- **NFR-MNT-01:** Business logic shall be decoupled from framework code (service layer pattern).
- **NFR-MNT-02:** Theme assets shall be loaded dynamically from a theme registry, not hardcoded.

---

## 7. Data Model

### 7.1 Core Entities

```python
# User
class User(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_config: AvatarConfig
    total_points: int
    current_streak: int
    last_streak_update: datetime
    lives_remaining: int
    created_at: datetime

# Course
class Course(BaseModel):
    id: UUID
    user_id: UUID
    name: str              # e.g., "CS 3000 - Algorithms"
    theme: Theme           # enum: MARIO | POKEMON | GREEK
    syllabus_text: str
    skills_graph: SkillsGraph
    created_at: datetime

# Lecture
class Lecture(BaseModel):
    id: UUID
    course_id: UUID
    order_index: int       # 1, 2, 3...
    title: str
    topics: list[str]
    scheduled_date: date
    slide_chunks: list[str]  # chunked for RAG
    is_exam: bool
    exam_type: Optional[ExamType]  # MIDTERM | FINAL

# Level (gameplay unit)
class Level(BaseModel):
    id: UUID
    lecture_id: UUID
    course_id: UUID
    order_index: int
    state: LevelState      # LOCKED | AVAILABLE | COMPLETED
    theme_segment: str     # e.g., "olympus", "aegean_sea"
    monster: MonsterConfig
    best_score: Optional[int]

# Battle (an attempt at a level)
class Battle(BaseModel):
    id: UUID
    level_id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: Optional[datetime]
    outcome: Optional[BattleOutcome]  # WIN | LOSE | ABANDONED
    user_hp_start: int
    monster_hp_start: int
    user_hp_end: int
    monster_hp_end: int
    questions: list[QuestionAttempt]
    points_awarded: int

# Question
class Question(BaseModel):
    id: UUID
    type: QuestionType     # MCQ | SPOKEN | PSEUDOCODE | MATH | SHORT_ANSWER
    difficulty: Difficulty # EASY | MEDIUM | HARD
    prompt: str
    options: Optional[list[str]]  # for MCQ
    correct_answer: str
    rubric: Optional[str]  # for free-form grading
    concepts_tested: list[str]  # skill IDs
    source_lecture_id: UUID

# QuestionAttempt
class QuestionAttempt(BaseModel):
    question: Question
    user_answer: str
    is_correct: bool
    partial_credit: float  # 0.0 - 1.0
    feedback: str
    damage_dealt: int
    damage_taken: int

# Skill (node in skills graph)
class Skill(BaseModel):
    id: UUID
    course_id: UUID
    name: str
    description: str
    prerequisites: list[UUID]  # parent skill IDs
    state: SkillState      # LOCKED | ATTEMPTED | MASTERED
    mastery_score: float   # 0.0 - 1.0

# SkillsGraph
class SkillsGraph(BaseModel):
    course_id: UUID
    skills: list[Skill]
    edges: list[tuple[UUID, UUID]]  # (from, to)

# MonsterConfig
class MonsterConfig(BaseModel):
    name: str              # e.g., "Hades", "Charizard"
    sprite_path: str
    hp: int
    attack_animation: str
    voice_tone: str        # flavor prompt for question phrasing

# AvatarConfig
class AvatarConfig(BaseModel):
    base_character: str
    unlocked_items: list[str]
    equipped_items: dict[str, str]  # slot -> item_id
```

### 7.2 Enums

```python
class Theme(str, Enum):
    MARIO = "mario"
    POKEMON = "pokemon"
    GREEK = "greek"

class LevelState(str, Enum):
    LOCKED = "locked"
    AVAILABLE = "available"
    COMPLETED = "completed"

class QuestionType(str, Enum):
    MCQ = "mcq"
    SPOKEN = "spoken"
    PSEUDOCODE = "pseudocode"
    MATH = "math"
    SHORT_ANSWER = "short_answer"

class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class SkillState(str, Enum):
    LOCKED = "locked"
    ATTEMPTED = "attempted"
    MASTERED = "mastered"

class BattleOutcome(str, Enum):
    WIN = "win"
    LOSE = "lose"
    ABANDONED = "abandoned"

class ExamType(str, Enum):
    MIDTERM = "midterm"
    FINAL = "final"
```

### 7.3 Course Package Input Schema

A course package is the **raw input format** for ingestion. It lives on disk as a folder of files and is the source of truth for relational data (lecture order, schedule dates, exam placement). It is distinct from the vector store representation (Section 7.4) — these files are _transformed into_ embedded documents during ingestion, not embedded directly.

#### 7.3.1 Folder Layout

```
{course_slug}/
├── course.json            # top-level course metadata (richer than Course entity — see §7.3.2)
├── syllabus.md            # human-readable syllabus (converted from PDF)
├── schedule.json          # lecture-by-lecture schedule (canonical source of truth)
├── slides/
│   ├── lec_01.pdf
│   ├── lec_02.pdf
│   ├── ...
│   └── lec_NN.pdf
├── lectures/              # generated per-lecture JSONs with slide chunks (see §7.3.5)
│   ├── lec_01.json
│   └── lec_NN.json
├── chunk_slides.py        # reproducible chunking script (run once to generate lectures/)
└── skills_graph.json      # optional pre-computed; else generated at ingest
```

#### 7.3.2 `course.json`

> **Note:** `course.json` replaces the earlier `manifest.json` concept. It contains real-world course metadata beyond the SRS `Course` entity (§7.1). Fields like `theme`, `user_id`, and `skills_graph` are runtime/gameplay state attached at ingest time and do NOT live here.

```json
{
  "id": "cs188-fall-2025",
  "code": "CS 188",
  "name": "Introduction to Artificial Intelligence",
  "semester": "Fall 2025",
  "university": "UC Berkeley",
  "department": "Electrical Engineering and Computer Science",
  "units": 4,
  "faculty": ["Pieter Abbeel", "Stuart Russell", "Anca Dragan"],
  "lecture_count": 24,
  "description": "Ideas and techniques underlying the design of intelligent computer systems.",
  "textbook": {
    "title": "Artificial Intelligence: A Modern Approach",
    "edition": "4th US ed.",
    "authors": ["Stuart Russell", "Peter Norvig"]
  },
  "grading": {
    "projects": 25,
    "homeworks": 20,
    "midterm": 20,
    "final_exam": 35
  },
  "assessment": {
    "midterm": { "week": 8, "duration_hours": 2, "type": "paper" },
    "final": { "week": 14, "duration_hours": 3, "type": "paper" }
  },
  "prerequisites": [
    "CS 61A or CS 61B",
    "CS 70 or Math 55"
  ],
  "course_website": "https://inst.eecs.berkeley.edu/~cs188",
  "created_at": "2025-08-01"
}
```

#### 7.3.3 `schedule.json`

> **Deviations from earlier design:**
> - Top-level fields (`semester`, `start_date`, `end_date`, `midterm_date`, `final_date`, `break_week`) make the file self-contained.
> - `lecture_id` is a zero-padded numeric string (`"01"`, `"02"`) — the prefix `lec_` is added by the loader when constructing Chroma doc IDs and SQL foreign keys.
> - `slide_deck` replaces `slide_file`.
> - `exam` (nullable string: `"midterm" | "final" | null`) replaces the `is_exam` + `exam_type` pair. Exam is flagged on the last content lecture before the exam date, not as a separate schedule entry.
> - `week` field added; `estimated_difficulty` and `covers_lectures` fields dropped (difficulty is computed at battle-generation time; coverage is derived from order).

```json
{
  "semester": "Fall 2025",
  "start_date": "2025-09-02",
  "end_date": "2025-12-12",
  "midterm_date": "2025-10-24",
  "final_date": "2025-12-15",
  "break_week": 9,
  "lectures": [
    {
      "lecture_id": "01",
      "week": 1,
      "order_index": 1,
      "title": "Introduction to AI",
      "topics": ["Overview of Artificial Intelligence", "Intelligent Agents", "Problem Formulation"],
      "scheduled_date": "2025-09-02",
      "slide_deck": "slides/lec_01.pdf",
      "exam": null
    },
    {
      "lecture_id": "02",
      "week": 1,
      "order_index": 2,
      "title": "Uninformed Search",
      "topics": ["Search Strategies", "BFS", "DFS", "Uniform Cost Search"],
      "scheduled_date": "2025-09-04",
      "slide_deck": "slides/lec_02.pdf",
      "exam": null
    },
    {
      "lecture_id": "15",
      "week": 8,
      "order_index": 15,
      "title": "Bayes Nets: Inference",
      "topics": ["Exact Inference", "Variable Elimination", "Belief Propagation"],
      "scheduled_date": "2025-10-21",
      "slide_deck": "slides/lec_15.pdf",
      "exam": "midterm"
    }
  ]
}
```

#### 7.3.4 `lectures/lec_NN.json` (Generated by `chunk_slides.py`)

Each file bundles all slide chunks for one lecture alongside per-page token metadata. The `chunks` array is the primary output consumed by the ingestor.

```json
{
  "lecture_id": "lec_01",
  "order_index": 1,
  "week": 1,
  "title": "Introduction to AI",
  "topics": ["Overview of Artificial Intelligence", "Intelligent Agents"],
  "scheduled_date": "2025-09-02",
  "slide_deck": "slides/lec_01.pdf",
  "exam": null,
  "course_id": "cs188-fall-2025",
  "slide_metadata": {
    "page_count": 74,
    "total_tokens": 4807,
    "pages": [
      { "page_number": 1, "token_count": 50, "char_count": 218 }
    ]
  },
  "chunks": [
    {
      "doc_id": "cs188_fall_2025_lec_01_slide_chunk_000",
      "course_id": "cs188-fall-2025",
      "doc_type": "lecture_slide_chunk",
      "text": "[From CS 188 Lecture 1: Introduction to AI] ...",
      "metadata": {
        "course_id": "cs188-fall-2025",
        "lecture_id": "lec_01",
        "chunk_index": 0,
        "source_page": 3,
        "source_pages": [1, 2, 3, 4, 5, 6, 7],
        "chunk_type": "intro",
        "token_count": 500
      }
    }
  ]
}
```

Regenerate with `cd {course_slug} && python3 chunk_slides.py`. Requires `pypdf` and `tiktoken`. Idempotent.

#### 7.3.5 `skills_graph.json` (Optional Pre-Computed)

For the demo course, this file SHOULD be hand-authored to skip the ~30s Claude generation step at ingest. For arbitrary courses, ingestion generates this automatically.

```json
{
  "course_id": "cs3000-fall2025",
  "skills": [
    {
      "skill_id": "skl_big_o",
      "name": "Big-O Notation",
      "description": "Upper-bound asymptotic analysis of algorithm runtime.",
      "taught_in_lectures": ["lec_01"],
      "prerequisites": []
    },
    {
      "skill_id": "skl_master_theorem",
      "name": "Master Theorem",
      "description": "Solving divide-and-conquer recurrences.",
      "taught_in_lectures": ["lec_02"],
      "prerequisites": ["skl_big_o", "skl_recurrence"]
    }
  ],
  "edges": [
    { "from": "skl_big_o", "to": "skl_master_theorem" },
    { "from": "skl_recurrence", "to": "skl_master_theorem" }
  ]
}
```

### 7.4 Vector Store Document Schema (RAG-Optimized)

**Design principle:** every piece of course information — syllabus, schedule, lecture content, concept definitions, prerequisite relationships, exam descriptions — is transformed into a **self-contained natural-language document** before embedding. This ensures all course knowledge is equally discoverable via similarity search, not siloed by data type.

This is deliberate denormalization for retrieval: each document repeats enough context (course name, lecture number, topic) that a single chunk pulled from the vector store is self-explanatory without additional joins or lookups.

#### 7.4.1 Unified Document Type

Every item stored in ChromaDB conforms to this schema:

```python
class CourseDocument(BaseModel):
    doc_id: str                    # unique ID, e.g., "cs3000_lec02_overview"
    course_id: str
    doc_type: DocType              # see enum below
    text: str                      # THE FIELD THAT GETS EMBEDDED
    metadata: dict[str, Any]       # for filtering only, not embedding

class DocType(str, Enum):
    COURSE_OVERVIEW = "course_overview"
    SYLLABUS_SECTION = "syllabus_section"
    SCHEDULE_ENTRY = "schedule_entry"
    LECTURE_OVERVIEW = "lecture_overview"
    LECTURE_SLIDE_CHUNK = "lecture_slide_chunk"
    CONCEPT_DEFINITION = "concept_definition"
    CONCEPT_RELATIONSHIP = "concept_relationship"
    EXAM_DESCRIPTION = "exam_description"
    WORKED_EXAMPLE = "worked_example"
```

Only the `text` field is embedded. `metadata` is used for Chroma `where` filters (scoping queries by `course_id`, `lecture_id`, `doc_type`, etc.) and is never part of the embedding vector.

#### 7.4.2 Document Type Definitions and Examples

Each lecture/course produces documents across these types. All text fields are written as standalone paragraphs that mention the course name and relevant context explicitly, so similarity search returns them even when the query does not specify which course or lecture.

**COURSE_OVERVIEW** — exactly one per course, high-level description.

```json
{
  "doc_id": "cs3000_overview",
  "course_id": "cs3000-fall2025",
  "doc_type": "course_overview",
  "text": "CS 3000 Algorithms, taught by Professor Smith in Fall 2025, is an introduction to algorithm design and analysis. The course covers asymptotic analysis, divide and conquer, dynamic programming, greedy algorithms, graph algorithms, and network flows across 15 lectures, with one midterm after lecture 7 and a final exam after lecture 15.",
  "metadata": { "course_id": "cs3000-fall2025", "doc_type": "course_overview" }
}
```

**SYLLABUS_SECTION** — one per major syllabus heading (grading policy, office hours, academic integrity, etc.).

```json
{
  "doc_id": "cs3000_syllabus_grading",
  "course_id": "cs3000-fall2025",
  "doc_type": "syllabus_section",
  "text": "In CS 3000 Algorithms, the grading breakdown is 30% problem sets, 30% midterm exam, 40% final exam. Problem sets are due weekly and late submissions incur a 10% penalty per day.",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "section_title": "grading_policy"
  }
}
```

**SCHEDULE_ENTRY** — one per lecture, stating when it happens and what it covers at a high level.

```json
{
  "doc_id": "cs3000_schedule_lec02",
  "course_id": "cs3000-fall2025",
  "doc_type": "schedule_entry",
  "text": "In CS 3000, Lecture 2 on September 9, 2025 covers Divide and Conquer. The topics discussed are merge sort, the master theorem, and recurrence relations. This is the second lecture of the course and comes before the midterm exam. The estimated difficulty is medium.",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "lecture_id": "lec_02",
    "lecture_order": 2,
    "scheduled_date": "2025-09-09",
    "is_exam": false
  }
}
```

**LECTURE_OVERVIEW** — one per lecture, pedagogical summary of what the lecture teaches and why.

```json
{
  "doc_id": "cs3000_lec02_overview",
  "course_id": "cs3000-fall2025",
  "doc_type": "lecture_overview",
  "text": "CS 3000 Lecture 2: Divide and Conquer. This lecture introduces the divide-and-conquer paradigm using merge sort as the canonical example. Students learn to decompose problems into subproblems, solve them recursively, and combine results. The master theorem is presented as a tool for analyzing the running time of divide-and-conquer recurrences like T(n) = 2T(n/2) + O(n).",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "lecture_id": "lec_02",
    "lecture_order": 2,
    "topics": "merge_sort,master_theorem,recurrence_relations"
  }
}
```

**LECTURE_SLIDE_CHUNK** — N per lecture, extracted from the slide PDF. Each chunk is prefixed with a **context header** (`[From CS 3000 Lecture 2: Divide and Conquer]`) so the chunk is self-identifying when retrieved in isolation.

> **Schema notes from CS188 build:**
> - `doc_id` embeds the full semester slug: `cs188_fall_2025_lec_01_slide_chunk_000` (3-digit zero-padded index).
> - `source_page` (int) is the **dominant page** (most tokens originated here); `source_pages` (list of ints) is the full provenance list — a 500-token chunk frequently spans 4–7 slide pages.
> - `chunk_type` is a positional heuristic: `"intro"` (first chunk), `"summary"` (last chunk), `"body"` (all others). Semantic classification is post-MVP.
> - `token_count` is included so the retrieval layer can enforce context budgets (NFR-PRF-04) without re-encoding chunks.
> - Chunks for a lecture are **bundled** into `lectures/lec_NN.json` under a `chunks: [...]` array rather than stored as individual files. The loader flattens `chunks → chroma.add(...)` at ingest time. Each chunk object still conforms to this schema exactly.

```json
{
  "doc_id": "cs188_fall_2025_lec_02_slide_chunk_003",
  "course_id": "cs188-fall-2025",
  "doc_type": "lecture_slide_chunk",
  "text": "[From CS 188 Lecture 2: Uninformed Search] Breadth-first search explores nodes level by level, guaranteeing the shallowest solution is found first. It uses a FIFO queue for the frontier. Time and space complexity are both O(b^d) where b is the branching factor and d is the depth of the shallowest goal.",
  "metadata": {
    "course_id": "cs188-fall-2025",
    "lecture_id": "lec_02",
    "chunk_index": 3,
    "source_page": 12,
    "source_pages": [10, 11, 12, 13],
    "chunk_type": "body",
    "token_count": 487
  }
}
```

**CONCEPT_DEFINITION** — one per skill in the skills graph, plain-language definition including where the concept is taught and what it depends on.

```json
{
  "doc_id": "cs3000_skl_master_theorem",
  "course_id": "cs3000-fall2025",
  "doc_type": "concept_definition",
  "text": "The Master Theorem is a concept taught in CS 3000 Algorithms, specifically in Lecture 2 on Divide and Conquer. It provides a cookbook method for solving recurrences of the form T(n) = aT(n/b) + f(n), common in divide-and-conquer algorithm analysis. To understand the Master Theorem, students should first understand Big-O notation and recurrence relations.",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "skill_id": "skl_master_theorem",
    "taught_in_lectures": "lec_02",
    "prerequisites": "skl_big_o,skl_recurrence"
  }
}
```

**CONCEPT_RELATIONSHIP** — one per edge in the skills graph, explaining the prerequisite dependency in natural language.

```json
{
  "doc_id": "cs3000_edge_bigO_master",
  "course_id": "cs3000-fall2025",
  "doc_type": "concept_relationship",
  "text": "In CS 3000 Algorithms, understanding Big-O notation (taught in Lecture 1) is a prerequisite for understanding the Master Theorem (taught in Lecture 2). Students need to be comfortable with asymptotic analysis before they can apply the Master Theorem to solve divide-and-conquer recurrences.",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "from_skill": "skl_big_o",
    "to_skill": "skl_master_theorem"
  }
}
```

**EXAM_DESCRIPTION** — one per exam, describing coverage and date.

```json
{
  "doc_id": "cs3000_midterm_01",
  "course_id": "cs3000-fall2025",
  "doc_type": "exam_description",
  "text": "CS 3000 Midterm 1 is scheduled for October 14, 2025, after Lecture 7. It covers all material from Lectures 1 through 7, including asymptotic analysis, divide and conquer, the master theorem, dynamic programming basics, and greedy algorithms. Students should expect questions on runtime analysis, recurrence solving, and algorithm design.",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "exam_type": "midterm",
    "covers_lectures": "lec_01,lec_02,lec_03,lec_04,lec_05,lec_06,lec_07"
  }
}
```

**WORKED_EXAMPLE** — zero or more per lecture, extracted from slides or generated by Claude at ingest time; useful for the "Visualize this" feature.

```json
{
  "doc_id": "cs3000_lec02_example_01",
  "course_id": "cs3000-fall2025",
  "doc_type": "worked_example",
  "text": "Worked example from CS 3000 Lecture 2 on Divide and Conquer: Applying the Master Theorem to merge sort. Merge sort has the recurrence T(n) = 2T(n/2) + O(n). Here a=2, b=2, f(n)=O(n), and n^(log_b(a)) = n^1 = n. Since f(n) = Theta(n^(log_b(a))), case 2 of the Master Theorem applies, giving T(n) = Theta(n log n).",
  "metadata": {
    "course_id": "cs3000-fall2025",
    "lecture_id": "lec_02",
    "concepts": "skl_master_theorem,skl_merge_sort"
  }
}
```

#### 7.4.3 Metadata Filtering Patterns

Even though every doc type is searchable via similarity, metadata filters remain essential for scoping queries during battle generation, post-battle explanation, and concept visualization. Expected query patterns:

```python
# Battle generation for a specific lecture — retrieve mixed doc types
chroma.query(
    query_texts=["master theorem applications"],
    n_results=10,
    where={
        "course_id": "cs3000-fall2025",
        "lecture_id": "lec_02"
    }
)

# Midterm battle generation — retrieve across covered lectures
chroma.query(
    query_texts=["algorithm runtime analysis"],
    n_results=20,
    where={
        "course_id": "cs3000-fall2025",
        "lecture_id": {"$in": ["lec_01", "lec_02", "lec_03",
                               "lec_04", "lec_05", "lec_06", "lec_07"]}
    }
)

# Concept visualization — prioritize definitions and worked examples
chroma.query(
    query_texts=["master theorem"],
    n_results=5,
    where={
        "course_id": "cs3000-fall2025",
        "doc_type": {"$in": ["concept_definition", "worked_example",
                             "lecture_slide_chunk"]}
    }
)
```

#### 7.4.4 Relationship to SQL-Backed Entities

The vector store holds **discoverable knowledge**. SQL still holds **transactional state** — user progress, battle attempts, level unlock status, current HP, points, streaks. The two stores are linked by stable IDs (`course_id`, `lecture_id`, `skill_id`) that appear in both.

Rule of thumb: if a piece of data answers _"what is true about the course content,"_ it goes in Chroma as a `CourseDocument`. If it answers _"what is true about the user right now,"_ it goes in SQL.

---

## 8. API Specification

All endpoints prefixed with `/api/v1`. Auth via `Authorization: Bearer <JWT>` header.

### 8.1 Auth

```
POST   /auth/login              { email, password } → { token, user }
POST   /auth/signup             { email, password, name } → { token, user }
GET    /auth/me                 → { user }
```

### 8.2 Courses

```
POST   /courses/ingest          multipart: syllabus.pdf, schedule.json, slides[].pdf
                                → { course_id, lectures[], skills_graph }
GET    /courses                 → { courses[] }
GET    /courses/{id}            → { course, lectures[], levels[] }
PATCH  /courses/{id}/theme      { theme } → { course }
```

### 8.3 World / Levels

```
GET    /courses/{id}/world      → { theme, levels[], current_level_id, segments[] }
GET    /levels/{id}             → { level, lecture, monster }
```

### 8.4 Battles

```
POST   /battles/start           { level_id } → { battle_id, initial_question, user_hp, monster_hp }
POST   /battles/{id}/answer     { question_id, answer, audio_blob? }
                                → { is_correct, damage_dealt, damage_taken,
                                    user_hp, monster_hp, next_question?, battle_outcome? }
POST   /battles/{id}/abandon    → { battle }
GET    /battles/{id}/summary    → { battle, missed_concepts[] }
```

### 8.5 Skills

```
GET    /courses/{id}/skills     → { skills_graph }
POST   /skills/{id}/visualize   → { svg_or_image_url, explanation }
```

### 8.6 User Progress

```
GET    /progress                → { points, streak, lives, avatar, recent_battles[] }
POST   /avatar/equip            { slot, item_id } → { avatar }
POST   /avatar/purchase         { item_id } → { avatar, points_remaining }
```

---

## 9. AI / RAG Subsystem Specification

### 9.1 Ingestion Pipeline

The ingestion pipeline transforms a raw course package (Section 7.3) into a collection of `CourseDocument` instances (Section 7.4) and writes both to ChromaDB and SQL. The defining characteristic of this pipeline is that **every piece of course knowledge — structured or unstructured — becomes a self-contained, embedded text document.** No course information lives exclusively in structured metadata where similarity search cannot reach it.

#### 9.1.1 Pipeline Stages

```
[Raw Course Package]
        ↓
(1) Parse raw inputs
        ↓
(2) Extract concepts + build skills graph (skip if pre-computed)
        ↓
(3) Transform all sources → CourseDocument instances
        ↓
(4) Embed each CourseDocument.text
        ↓
(5) Persist to ChromaDB (text + metadata) and SQL (structural state)
```

**Stage 1 — Parse raw inputs**

- Load `manifest.json`, `schedule.json`, `skills_graph.json` (if present).
- Extract text from `syllabus.pdf` using `pypdf` or `pdfplumber`, segmenting by heading.
- Extract text from each `slides/lecture_NN.pdf`, preserving slide/page boundaries.
- **Extract and caption images:** for each image/figure in each lecture PDF, pass the image to Claude vision with a caption prompt (see 9.1.4) and produce a text description of what the image depicts. Store the caption alongside its source slide. Without this step, diagrams, plots, graph visualizations, and circuit schematics — often the most pedagogically important content in a lecture — are invisible to similarity search. Captions become searchable `LECTURE_SLIDE_CHUNK` instances with `chunk_type: "figure_caption"` in metadata.

**Stage 2 — Extract concepts and build skills graph**

- If `skills_graph.json` is provided, load it directly (preferred for demo course to save ~30s).
- Otherwise, prompt Claude with all lecture texts to produce a structured list of concepts with prerequisites. Resolve cycles by dropping the weakest edge. Produce final DAG.

**Stage 3 — Transform all sources into `CourseDocument` instances**

This is the critical stage. For each raw input, the ingestor emits one or more `CourseDocument` instances with human-readable `text` fields written in full context:

| Raw Input                     | Produces                                                   | Notes                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `manifest.json`               | 1 × `COURSE_OVERVIEW`                                      | Claude rewrites manifest fields into a narrative paragraph                                                                                 |
| `syllabus.pdf` sections       | N × `SYLLABUS_SECTION`                                     | One doc per major heading (grading, OH, policies)                                                                                          |
| `schedule.json` lecture entry | 1 × `SCHEDULE_ENTRY` per lecture                           | Templated paragraph mentioning course, date, topics                                                                                        |
| Each lecture (not exam)       | 1 × `LECTURE_OVERVIEW`                                     | Claude generates pedagogical summary from slide text                                                                                       |
| Each lecture's slide text     | N × `LECTURE_SLIDE_CHUNK` (`chunk_type: "body"`)           | ~500 tokens each, 50-token overlap, **prefixed with context header** `[From {Course} Lecture {N}: {Title}]`                                |
| Each lecture's images         | N × `LECTURE_SLIDE_CHUNK` (`chunk_type: "figure_caption"`) | One per image; text is the Claude-generated caption, prefixed with context header; metadata includes `source_image_path` and `source_page` |
| Each skill in skills graph    | 1 × `CONCEPT_DEFINITION`                                   | Claude generates definition mentioning course + taught-in lecture + prereqs                                                                |
| Each edge in skills graph     | 1 × `CONCEPT_RELATIONSHIP`                                 | Templated paragraph describing the prereq link                                                                                             |
| Each exam in `schedule.json`  | 1 × `EXAM_DESCRIPTION`                                     | Templated paragraph mentioning date, covered lectures, topics                                                                              |
| Each lecture (optional)       | 0–3 × `WORKED_EXAMPLE`                                     | Claude extracts or generates examples with concept tags                                                                                    |

**Context header convention for slide chunks:** every `LECTURE_SLIDE_CHUNK.text` MUST be prefixed with `[From {course_name} Lecture {order_index}: {lecture_title}]` before the chunk body. This ensures chunks are self-identifying when retrieved without metadata. Without this header, a retrieved chunk reading _"the master theorem states..."_ is ambiguous across courses; with it, the chunk is unambiguous.

**Stage 4 — Embed**

- Generate embeddings using `text-embedding-3-small` (OpenAI) or `voyage-3` (Voyage AI).
- Embed ONLY the `text` field of each `CourseDocument`. Do NOT embed metadata.

**Stage 5 — Persist**

- Write each `CourseDocument` to ChromaDB: embedding + `text` + `metadata` + `doc_id`.
- Write structural state (Course, Lecture, Level, Skill, SkillsGraph edges) to SQL using the Pydantic models from Section 7.1.
- Verify ID consistency: every `course_id`, `lecture_id`, `skill_id` that appears in Chroma `metadata` MUST correspond to a row in SQL.

#### 9.1.2 Performance Targets

- **FR-ING-06 applies:** ingestion of a 15-lecture course SHALL complete in ≤60 seconds when `skills_graph.json` is pre-computed AND lectures are text-light (< 20 pages each).
- For image-heavy lectures (e.g., 60-page decks with 20+ figures each), image captioning becomes the bottleneck. Expect ≤5 minutes for a 15-lecture course with ~300 total images. Parallelize captioning calls up to the Anthropic API rate limit.
- Without pre-computed skills graph, add ~30s for concept extraction.
- Parallelize across lectures wherever possible: slide parsing, chunking, image captioning, lecture overview generation, and embedding are all independent per-lecture operations.
- **For the demo course, pre-run ingestion once and persist ChromaDB to disk. Do NOT re-ingest during the demo.** Pre-run ingestion is the single most important performance decision — it turns a 5-minute bottleneck into a 0-second one.

#### 9.1.3 Ingestion Output Summary

For the demo course (CS 3000, 15 lectures, 1 midterm, 1 final), expect approximately:

| Doc Type                               | Text-light lectures (~15 pp.) | Image-heavy lectures (~60 pp.)  |
| -------------------------------------- | ----------------------------- | ------------------------------- |
| `COURSE_OVERVIEW`                      | 1                             | 1                               |
| `SYLLABUS_SECTION`                     | 3–5                           | 3–5                             |
| `SCHEDULE_ENTRY`                       | 15                            | 15                              |
| `LECTURE_OVERVIEW`                     | 15                            | 15                              |
| `LECTURE_SLIDE_CHUNK` (body)           | 150–300                       | 900–1,500 (~60–100 per lecture) |
| `LECTURE_SLIDE_CHUNK` (figure_caption) | 0–30                          | 300–600 (~20–40 per lecture)    |
| `CONCEPT_DEFINITION`                   | 30–50                         | 30–50                           |
| `CONCEPT_RELATIONSHIP`                 | 40–70                         | 40–70                           |
| `EXAM_DESCRIPTION`                     | 2                             | 2                               |
| `WORKED_EXAMPLE`                       | 15–30                         | 15–30                           |
| **Total embedded documents**           | **~270–490**                  | **~1,300–2,300**                |

Even at the high end, ChromaDB handles a few thousand documents with sub-second retrieval. The volume scales fine — the concern is ingestion time (one-time cost) and retrieval selectivity (ongoing). See Section 9.2 for how tiered retrieval keeps per-query context bounded regardless of total corpus size.

#### 9.1.4 Image Captioning Prompt

Applied per image during Stage 1. The model used is Claude Sonnet 4 (or Haiku 4.5 for cost optimization — captions are mostly independent and can tolerate a slightly smaller model).

```
You are generating a searchable caption for a figure in a lecture slide deck.

Course: {course_name}
Lecture: {lecture_title} (Lecture {order_index})
Slide page: {page_number}

Look at this image and produce a detailed caption of what it shows. Include:
- The type of figure (graph, diagram, plot, code snippet, flowchart, equation, etc.)
- All visible labels, axis names, legends, and annotations
- What concept it illustrates
- Key relationships or data points depicted

Write the caption as 2-4 sentences of natural prose. Do NOT just describe
colors or layout — focus on the pedagogical content. A student searching
for this concept by name should be able to retrieve this caption.

Output only the caption text, no preamble.
```

The resulting caption is then wrapped in the standard context header convention:

```
[From {course_name} Lecture {order_index}: {lecture_title}, figure on page {page_number}]
{caption_text}
```

### 9.2 Battle Generation (LangGraph Agent)

Orchestrated as a LangGraph state machine:

```
[START] → retrieve_lecture_context → determine_question_mix →
generate_question_batch → validate_questions → [READY]
```

**Node details:**

- `retrieve_lecture_context`: Implements **tiered retrieval** to stay within the token budgets defined in NFR-PRF-04. Rather than a single flat top-k query over all docs, retrieval proceeds in tiers that exploit the summary hierarchy of the doc type system:

  **Tier 1 — Always include (structural grounding):**
  - All `LECTURE_OVERVIEW` docs for lectures in scope (1 per lecture; 1 for regular battle, 7 for midterm, 15 for final).
  - The relevant `EXAM_DESCRIPTION` for midterm/final battles.

  **Tier 2 — Concept retrieval (top-k similarity):**
  - Query `CONCEPT_DEFINITION` docs filtered by `lecture_id: {"$in": [...]}` with the battle's topic as query, retrieve top 3–5 for regular, top 8–12 for midterm, top 15–20 for final.
  - For midterm/final, also retrieve relevant `CONCEPT_RELATIONSHIP` docs to give the generator prereq awareness (top 3–5 by similarity).

  **Tier 3 — Detailed content (top-k slide chunks, bounded):**
  - Query `LECTURE_SLIDE_CHUNK` docs filtered by `lecture_id` and the concepts retrieved in Tier 2. Retrieve top 4–6 for regular, top 10–15 for midterm, top 20–30 for final.
  - Mix `chunk_type: "body"` and `chunk_type: "figure_caption"` — figure captions are often the densest pedagogical signal and should not be filtered out.

  **Tier 4 — Grounding examples:**
  - Retrieve 1–2 `WORKED_EXAMPLE` docs per lecture in scope, prioritized by concepts tested.

  After assembly, the concatenated context is grouped by doc type in the prompt (overviews first, then definitions, then chunks, then examples) and a hard token count is enforced: if the assembly exceeds the NFR-PRF-04 budget (5K / 8K / 15K), drop from Tier 3 outward (lowest-similarity slide chunks first), never from Tier 1.

  | Battle Type | Context Budget | Tier 1                   | Tier 2                                 | Tier 3       | Tier 4        |
  | ----------- | -------------- | ------------------------ | -------------------------------------- | ------------ | ------------- |
  | Regular     | 5,000 tok      | 1 overview               | 3–5 definitions                        | 4–6 chunks   | 1–2 examples  |
  | Midterm     | 8,000 tok      | 7 overviews + exam desc  | 8–12 definitions + 3–5 relationships   | 10–15 chunks | 3–5 examples  |
  | Final       | 15,000 tok     | 15 overviews + exam desc | 15–20 definitions + 5–10 relationships | 20–30 chunks | 5–10 examples |

- `determine_question_mix`: Based on battle type (regular/midterm/final) and user weaknesses, compute question count and type distribution.
- `generate_question_batch`: Single Claude call with structured output schema, requesting N questions at once (batch generation for speed).
- `validate_questions`: Schema validation; if invalid, regenerate that question only.

**Prompt template for question generation (skeleton):**

```
You are generating quiz questions for a {theme}-themed learning game.

Course: {course_name}
Lecture: {lecture_title}
Topics: {topics}

Based on this lecture content:
---
{retrieved_chunks}
---

Generate {n} questions with this distribution:
- {mcq_count} multiple choice
- {spoken_count} spoken concept checks (conceptual, answerable in 1-2 sentences)
- {code_count} pseudocode writing
- {math_count} math problems

Difficulty distribution: {difficulty_mix}

Phrase questions in a {theme} voice, as if asked by {monster_name}.
Do NOT change the technical content — only the flavor of the question text.

Return JSON matching this schema: { ... }
```

### 9.3 Answer Evaluation

For free-form answers (spoken, pseudocode, math, short answer), use Claude with a rubric prompt:

```
Question: {question}
Correct Answer: {correct_answer}
Rubric: {rubric}
User's Answer: {user_answer}

Evaluate the user's answer. Return JSON:
{
  "correct": boolean,
  "partial_credit": float (0.0 - 1.0),
  "feedback": "one-sentence explanation in the voice of {monster_name}"
}
```

### 9.4 Post-Battle Explanation Generation

On "Visualize this" or "Explain" click:

1. Retrieve top-k=5 chunks from ChromaDB filtered by concept/lecture.
2. Prompt Claude for a concise explanation + optional SVG visualization.
3. Cache result by `(concept_id, user_id)` for fast repeat access.

---

## 10. Game Logic Specification

### 10.1 HP / Damage Formulas

```python
BASE_DAMAGE = 10
DIFFICULTY_MULTIPLIER = {"easy": 0.5, "medium": 1.0, "hard": 1.5}

def compute_damage(is_correct: bool, difficulty: Difficulty,
                   partial_credit: float) -> tuple[int, int]:
    """Returns (damage_to_monster, damage_to_user)."""
    base = BASE_DAMAGE * DIFFICULTY_MULTIPLIER[difficulty]
    if is_correct:
        return (int(base), 0)
    elif partial_credit >= 0.5:
        return (int(base * partial_credit), int(base * (1 - partial_credit)))
    else:
        return (0, int(base))
```

### 10.2 HP Presets

| Battle Type          | User HP | Monster HP | Question Count |
| -------------------- | ------- | ---------- | -------------- |
| Regular post-lecture | 30      | 100        | 5–7            |
| Midterm boss         | 50      | 300        | 12–15          |
| Final boss           | 100     | 500        | 20–25          |

### 10.3 Points Formula

```python
def compute_points(battle_outcome, base_points, streak) -> int:
    if battle_outcome != BattleOutcome.WIN:
        return 0
    multiplier = min(1.0 + (streak * 0.1), 3.0)
    return int(base_points * multiplier)

# Base points by battle type
BASE_POINTS = {"regular": 100, "midterm": 500, "final": 2000}
```

### 10.4 Streak Rules

- Streak **increments** when a post-lecture battle is completed before the next lecture's scheduled date.
- Streak **resets to 0** when: 3 defeats in a single battle, OR a post-lecture battle deadline is missed.
- Battles can still be played after streak is broken but do not contribute to future streaks until the next successful completion.

### 10.5 Level Progression Rules

- A level is `LOCKED` until the immediately prior level is `COMPLETED`.
- A level is `COMPLETED` when its associated battle has been won at least once.
- Completed levels remain replayable but do not award additional points.

---

## 11. Theming Specification

### 11.1 Theme Registry Structure

Each theme is a JSON manifest:

```json
{
  "theme_id": "greek",
  "display_name": "Greek Mythology",
  "segments": [
    {
      "id": "olympus",
      "range": [1, 3],
      "bg_image": "/themes/greek/olympus.png",
      "music": "/themes/greek/olympus.mp3"
    },
    { "id": "athens", "range": [4, 6], "bg_image": "...", "music": "..." },
    { "id": "aegean", "range": [7, 9], "bg_image": "...", "music": "..." },
    { "id": "island", "range": [10, 12], "bg_image": "...", "music": "..." },
    { "id": "underworld", "range": [13, 15], "bg_image": "...", "music": "..." }
  ],
  "monsters": [
    {
      "id": "minor_spirit",
      "sprite": "...",
      "hp_tier": "low",
      "attack_anim": "wind_gust",
      "attack_sound": "..."
    },
    {
      "id": "siren",
      "sprite": "...",
      "hp_tier": "medium",
      "attack_anim": "sound_wave",
      "attack_sound": "..."
    },
    {
      "id": "hades",
      "sprite": "...",
      "hp_tier": "boss",
      "attack_anim": "flame_burst",
      "attack_sound": "..."
    }
  ],
  "avatars": [
    { "id": "hero", "sprite": "...", "attack_anim": "sword_slash" },
    { "id": "scholar", "sprite": "...", "attack_anim": "scroll_throw" }
  ],
  "voice_tone_prompt": "Phrase questions with formal, oracle-like language..."
}
```

### 11.2 Sprite Asset Strategy

- Use open-source 16-bit or 32-bit sprite packs (e.g., itch.io, OpenGameArt.org) filtered by CC0 or similar permissive license.
- Store sprites in `public/themes/{theme_id}/` as PNG.
- Use a JSON atlas for animation frames.
- **For hackathon demo:** pre-generate all required sprites; do not generate at runtime.

### 11.3 Audio Strategy

- Background loops: 30–60s loops, MP3/OGG.
- SFX: short (<1s) clips for attacks, hits, wins, losses.
- Use Howler.js or native HTMLAudioElement for playback.
- Volume controls in settings.

---

## 12. Implementation Plan & Milestones

### 12.1 Hour-by-Hour Hackathon Plan (24-hour version)

| Hours | Track A: Frontend                           | Track B: Backend/AI                             | Track C: Design/Content                          |
| ----- | ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| 0–2   | Next.js scaffold, Tailwind, shadcn/ui setup | FastAPI scaffold, DB models, env config         | Gather sprite packs, music, select demo course   |
| 2–5   | World view layout, level path rendering     | Course ingestion pipeline (chunk, embed, store) | Build mock course JSON (CS subject, 10 lectures) |
| 5–8   | Battle view UI, HP bars, speech bubble      | Battle generation LangGraph, Claude prompts     | Record/pick battle SFX, background loops         |
| 8–11  | Battle animations (Framer Motion), sprites  | Answer evaluation endpoint                      | Create theme manifests (all 3 themes)            |
| 11–14 | Skills graph (React Flow), node details     | Skills graph generation, mastery updates        | Avatar customization assets                      |
| 14–17 | Post-battle summary, visualize modal        | Explanation generation, caching layer           | QA pass on question quality                      |
| 17–20 | Theme switcher, avatar customization UI     | Streak/points logic, lives reset                | Demo script writing                              |
| 20–22 | Polish animations, sound integration        | Error handling, fallback banks                  | Pitch rehearsal                                  |
| 22–24 | End-to-end testing, bug fixing              | Deployment (Vercel + Render)                    | Final demo run-throughs                          |

### 12.2 Critical Path

The demo-critical path is: **Ingest → World View → Start Battle → Answer Question → Win → See Skills Unlock**. Everything else can degrade without killing the demo. Build this spine first, decorate after.

### 12.3 Demo Fallback Plan

If live generation is unreliable during demo:

- Pre-generate and cache question banks for the demo course.
- Pre-compute the skills graph.
- Have a hardcoded "golden path" battle sequence ready to trigger.

---

## 13. Appendices

### Appendix A: Demo Course Recommendation

Use **CS 3000 Algorithms** or **Intro to Statistics** as the demo course — both have visually rich concepts (graph algorithms, distributions) that lend themselves to the "Visualize this" feature. Avoid courses with heavy equation-only content for demo (harder to visualize in 60 seconds).

### Appendix B: Recommended Open-Source Assets

- **Sprites:** itch.io "16x16 Dungeon Tileset," "Pokemon-inspired free pack," "Greek Mythology Pixel Pack"
- **Music:** OpenGameArt.org "Fantasy RPG" category, filtered CC0
- **SFX:** Freesound.org "retro game SFX pack"

### Appendix C: Environment Variables

```
# Backend (.env)
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...            # for Whisper + embeddings
CHROMA_PERSIST_DIR=./chroma_data
DATABASE_URL=sqlite:///./app.db
JWT_SECRET=...
CORS_ORIGINS=http://localhost:3000,https://aristotle.vercel.app

# Frontend (.env.local)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_ENV=development
```

### Appendix D: Deployment Checklist

- [ ] Frontend deployed to Vercel with `NEXT_PUBLIC_API_BASE_URL` pointing to prod backend
- [ ] Backend deployed to Render with all env vars set
- [ ] CORS configured to allow Vercel domain
- [ ] ChromaDB persistence confirmed (volume mounted on Render)
- [ ] Demo course pre-ingested in prod DB
- [ ] Smoke test: full battle flow works end-to-end
- [ ] Fallback question bank seeded
- [ ] Audio/sprite assets served correctly (check network tab)

### Appendix E: Risks and Mitigations

| Risk                                    | Likelihood | Impact   | Mitigation                                                     |
| --------------------------------------- | ---------- | -------- | -------------------------------------------------------------- |
| LLM latency spikes during demo          | Medium     | High     | Pre-cache questions for demo course                            |
| Whisper API failures                    | Medium     | Medium   | Fallback to text input for spoken questions                    |
| Sprite/audio copyright issues           | Low        | High     | Use only CC0/permissive assets; document sources               |
| Skills graph generation produces cycles | Medium     | Medium   | Post-process validation; break cycles by dropping weakest edge |
| Demo WiFi instability                   | Medium     | Critical | Record backup demo video; have laptop hotspot ready            |
| Team time overrun                       | High       | High     | Lock MVP spine by hour 14; feature-freeze at hour 20           |

---

**End of SRS v1.0**
