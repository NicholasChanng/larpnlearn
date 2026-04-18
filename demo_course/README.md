# Demo Course — CS 188 Intro to AI (Berkeley)

Pre-baked course package used by the Aristotle demo. Layout follows SRS §7.3.

## Files

- `manifest.json` — top-level course metadata
- `schedule.json` — lecture-by-lecture schedule (14 lectures + midterm + final)
- `skills_graph.json` — hand-authored skills DAG (skip Claude generation at ingest)
- `slides/` — lecture slide PDFs (populate with sourced CS 188 decks)
- `question_bank.json` — pre-generated fallback questions per SRS 12.3

## Sourcing slides

CS 188 Spring 2024 materials are publicly accessible at:
- https://inst.eecs.berkeley.edu/~cs188/sp24/
- Lecture slides: https://inst.eecs.berkeley.edu/~cs188/sp24/lectures/

**Owner: Track-6 (Content/Data).** Populate `slides/lecture_NN.pdf` for lectures 1–14 (skip placeholder exam entries). Name files to match `schedule.json` `slide_file` values exactly.

## After populating slides

Run one-time ingestion:

```bash
cd backend
uv run python -m app.services.ingestion_service --course-dir ../demo_course
```

This produces `backend/chroma_data/` (commit it for the demo) and seeds SQL.

Per SRS 9.1.2 and 12.3: **do NOT re-ingest during the demo.**
