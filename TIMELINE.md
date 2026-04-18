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

## Next up

Team picks tracks and starts opening feature PRs against the skeleton. The critical path for demo is: **Ingest → World View → Start Battle → Answer → Win → Skills Unlock** (SRS 12.2). Build that spine first, polish after.
