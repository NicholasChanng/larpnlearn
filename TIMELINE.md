# Aristotle — Project Timeline

A running log of what's been done, so teammates joining later can catch up fast.

---

## 2026-04-18 — Skeleton commit (`420b417`)

Kickoff. Took the SRS ([aristotle_srs.md](aristotle_srs.md)) and built the full monorepo skeleton so the 3-person team can work non-blocking PRs in parallel.

### Decisions locked in

- **Auth:** deferred; MVP uses a single hardcoded demo user (Section 5.1 of SRS treated as out-of-scope for demo).
- **Voice answers:** in scope — Whisper API integration planned (differentiator).
- **Themes:** all three shipped, but Greek Mythology built first and fully polished.
- **Ingestion:** pre-baked for the 2-minute demo. The [demo_course/](demo_course/) package is hand-authored; Chroma data is pre-computed once and committed. No live ingestion during demo.
- **Demo course:** CS 188 Berkeley AI (Spring 2024).
- **Monorepo:** single repo with `backend/` + `frontend/` + `demo_course/` folders.
- **Python tooling:** `uv`.
- **Deployment:** baked in from the start — `backend/render.yaml` + `frontend/vercel.json`.

### What the skeleton includes

**Backend** ([backend/](backend/)) — FastAPI + Pydantic + SQLModel + uv
- All Pydantic schemas mirroring SRS §7.1 in [app/models.py](backend/app/models.py)
- All enums from §7.2 in [app/enums.py](backend/app/enums.py)
- SQLModel tables for transactional state in [app/db/tables.py](backend/app/db/tables.py)
- Stub routes for every endpoint in SRS §8, each returning deterministic mock data from [app/mock_data.py](backend/app/mock_data.py) — so the frontend can hit real HTTP from day one
- Game logic ready-to-use: [app/game/damage.py](backend/app/game/damage.py), [app/game/points.py](backend/app/game/points.py)
- `services/`, `ai/`, `rag/` modules stubbed with `NotImplementedError` + track ownership notes
- `Dockerfile` + `render.yaml` for Render deploy
- 3 passing smoke tests ([tests/test_health.py](backend/tests/test_health.py))

**Frontend** ([frontend/](frontend/)) — Next.js 14 App Router + Tailwind + Zustand
- 4 routes working end-to-end against the mocked API: [`/world`](frontend/app/world/page.tsx), [`/battle/[id]`](frontend/app/battle/[id]/page.tsx), [`/skills`](frontend/app/skills/page.tsx), [`/avatar`](frontend/app/avatar/page.tsx)
- Shared types in [lib/types.ts](frontend/lib/types.ts) — keep in sync with backend `models.py`
- Typed API client in [lib/api.ts](frontend/lib/api.ts)
- Zustand stores: [user](frontend/store/useUserStore.ts), [battle](frontend/store/useBattleStore.ts), [theme](frontend/store/useThemeStore.ts)
- Top bar with streak/points/lives; shadcn Button primitive
- `vercel.json` for Vercel deploy
- Typecheck + production build both green

**Demo course** ([demo_course/](demo_course/)) — CS 188 Berkeley AI, Spring 2024
- [manifest.json](demo_course/manifest.json) + [schedule.json](demo_course/schedule.json): 14 lectures + midterm + final
- [skills_graph.json](demo_course/skills_graph.json): hand-authored — 29 concepts, 29 prereq edges (skips ~30s Claude DAG generation at ingest per SRS 7.3.4)
- [question_bank.json](demo_course/question_bank.json): fallback stub per SRS 12.3
- [slides/](demo_course/slides/): empty, awaiting sourced PDFs

**Theme manifests** ([frontend/public/themes/](frontend/public/themes/))
- Greek (full monster/segment/avatar roster per SRS 11.1), Mario, Pokémon
- Asset directories for sprites/avatars/bg/music/sfx — awaiting sourced assets

### Verified working

- `uv sync` installs cleanly
- Backend tests pass (3/3)
- Backend boots without `.env` (all config fields have defaults; API clients are lazy)
- `curl /health` → 200, `curl /api/v1/courses/cs188-sp2024/world` → full JSON with 15 levels
- `npm install` + `tsc --noEmit` clean
- `npm run build` produces all 7 routes
- Frontend + backend run together locally and render mock data end-to-end

### Track assignments

Still TBD — see the table in [README.md](README.md#team-tracks). Six tracks defined, each with disjoint file ownership so PRs don't collide.

---

## 2026-04-18 — CS188 mock data added (`cs188/`)

Real course data for **UC Berkeley CS 188 — Introduction to Artificial Intelligence (Fall 2025)** was sourced, processed, and committed to `cs188/`. This replaces the placeholder `demo_course/` fixtures (now deleted) as the canonical demo course.

### What's in `cs188/`

- `course.json` — full course metadata (faculty, grading, textbook, prerequisites, assessment schedule)
- `syllabus.md` — human-readable syllabus converted from the official PDF
- `schedule.json` — 24 lectures with dates, topics, and slide paths; midterm flagged on lec 15, final on lec 24
- `slides/lec_01.pdf … lec_24.pdf` — 24 lecture decks, 1,094 total pages
- `lectures/lec_01.json … lec_24.json` — generated per-lecture JSONs with slide chunks ready for ChromaDB ingest
- `chunk_slides.py` — reproducible chunking script (pypdf + tiktoken, 500-token window, 50-token overlap)

**Stats:** 24 lectures · 1,094 slide pages · 141 chunks · ~66,300 total tokens · 5.9 avg chunks/lecture

### Schema deviations from SRS — now canonicalized in §7.3

These intentional deviations were made during the CS188 build and are now reflected in the SRS data model:

| Area | SRS (original) | Actual (CS188) | Rationale |
|---|---|---|---|
| Folder structure | `manifest.json` | `course.json` + `lectures/` directory | Richer metadata; bundled chunks for dev ergonomics |
| Course metadata | Minimal (`id`, `name`, `theme`, …) | Adds `code`, `semester`, `university`, `faculty[]`, `units`, `textbook`, `grading{}`, `assessment{}`, `prerequisites[]` | Mock data describes real-world course; gameplay state (`theme`, `user_id`) attached at runtime |
| `schedule.json` shape | `course_id` + `lectures[]` | Top-level semester dates + `break_week` + `lectures[]` | Self-contained; no external calendar reference needed |
| `lecture_id` format | `"lec_01"` | `"01"` (numeric string) | Loader prepends `lec_` when constructing Chroma doc IDs and SQL keys |
| Slide file field | `slide_file` | `slide_deck` | Clearer naming |
| Exam flag | `is_exam: bool` + `exam_type: str` | `exam: "midterm" \| "final" \| null` | Single nullable field; exam flagged on last content lecture, not a separate schedule entry |
| Chunk files | Implied one-file-per-chunk | All chunks bundled in `lectures/lec_NN.json` under `chunks: []` | 141 tiny files is hostile to diff tools; loader flattens at ingest time |
| Chunker | `RecursiveCharacterTextSplitter` | `tiktoken cl100k_base` sliding window | Exact token counts (not char approximation); no LangChain dependency at mock-data time |
| `source_page` | Single int | `source_page` (dominant page) + `source_pages` (full list) | A 500-token chunk spans 4–7 pages; provenance list needed for accurate citation |
| `chunk_type` enum | `"body"` shown but not defined | `"intro"` / `"body"` / `"summary"` (positional heuristic) | Enables filtered retrieval of intro/summary chunks for high-level context |
| `token_count` in metadata | Not specified | Added | Lets retrieval layer enforce NFR-PRF-04 context budgets without re-encoding |
| `doc_id` format | `cs3000_lec02_slide_chunk_03` | `cs188_fall_2025_lec_01_slide_chunk_000` | Semester included in slug; 3-digit padding for lectures with >10 chunks |

---

## Next up

Team picks tracks and starts opening feature PRs against the skeleton. The critical path for demo is: **Ingest → World View → Start Battle → Answer → Win → Skills Unlock** (SRS 12.2). Build that spine first, polish after.
