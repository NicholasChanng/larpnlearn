# Larp N Learn

Winner of the Best Game Award at HackPrinceton Spring 2026. 

Projects that successfully create interactive, exciting, and innovative games through a variety of methods and forms. Examples include Player v. Player games or individual games.

Team Members: Nicholas Channg, Sai Nellutla, Tanay Mehrish

Devpost: https://devpost.com/software/larp-wmveqg

Demo: https://aristotle-hazel.vercel.app/

<img width="1611" height="1104" alt="image" src="https://github.com/user-attachments/assets/00c3bce5-5733-41d4-995c-d8a746782ebc" />

Full spec: [aristotle_srs.md](aristotle_srs.md).

## Repo layout

```
aristotle/
├── backend/         FastAPI + Pydantic + SQLModel + ChromaDB + LangGraph
├── frontend/        Next.js 14 App Router + Tailwind + shadcn/ui + Zustand
├── demo_course/     CS 188 Berkeley AI — pre-baked course package + question bank
└── aristotle_srs.md The spec
```

## Prerequisites

- Node.js ≥ 20
- Python ≥ 3.11
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Anthropic API key + OpenAI API key (for Whisper STT + embeddings)

## Local dev

### Backend

```bash
cd backend
uv sync
cp .env.example .env       # fill in ANTHROPIC_API_KEY, OPENAI_API_KEY
uv run uvicorn app.main:app --reload --port 8000
```

Backend runs on `http://localhost:8000`. Swagger docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs on `http://localhost:3000`.

### Both at once

```bash
docker compose up
```

## API contract

All endpoints under `/api/v1/*`. The skeleton ships stub endpoints returning valid mock data matching the real schemas — frontend can develop against real HTTP from day one. See [backend/app/api/routes/](backend/app/api/routes/) and [Section 8 of the SRS](aristotle_srs.md).

## Team tracks

See the implementation plan in the PR description / team chat. Each track owns non-overlapping files; PRs should stay within one track to stay non-blocking.

| Track | Owner | Scope |
|---|---|---|
| Frontend-World | — | World map, theme switcher, top bar |
| Frontend-Battle | — | Battle scene, voice input, animations |
| Frontend-Skills+Avatar | — | Skills DAG, avatar customizer |
| Backend-Game | — | Game engine, CRUD APIs, SQLite |
| Backend-AI/RAG | — | LangGraph battle agent, ChromaDB, Whisper |
| Content/Data | — | CS 188 course package, theme assets |

## Demo course

CS 188 Berkeley AI. Course package in [demo_course/](demo_course/). Pre-ingest once and persist ChromaDB to disk — never re-ingest during the demo.

## Deployment

- **Frontend:** Vercel. `frontend/vercel.json` included.
- **Backend:** Render. `backend/render.yaml` + `backend/Dockerfile` included.
- See [aristotle_srs.md Appendix D](aristotle_srs.md) for the deployment checklist.
