# CS188 Mock Data — Build Process

Documentation of how the `cs188/` mock dataset was built, and where decisions diverged from `aristotle_srs.md`.

## Source Material

- **Course:** UC Berkeley CS 188 — Introduction to Artificial Intelligence (Fall 2025)
- **Inputs:**
  - `syllabus.pdf` (4-page PDF, scraped from official course site)
  - `slides/lec_01.pdf` … `slides/lec_24.pdf` (24 lecture decks)

## Output Structure

```
cs188/
├── course.json              # Course metadata (grading, faculty, exams)
├── syllabus.md              # Human-readable syllabus (converted from PDF)
├── schedule.json            # 24 lectures with dates, topics, slide paths
├── slides/                  # Original lecture PDFs (unchanged)
│   └── lec_01.pdf … lec_24.pdf
├── lectures/                # Generated per-lecture JSONs with chunks
│   └── lec_01.json … lec_24.json
├── chunk_slides.py          # Reproducible chunking script
└── PROCESS.md               # This file
```

## Build Steps

1. **Parse `syllabus.pdf`** → extract course metadata, weekly schedule, grading, exam info.
2. **Write `course.json`** — structured metadata (faculty, units, grading weights, exam durations).
3. **Write `syllabus.md`** — human-readable conversion with the 14-week schedule table preserved.
4. **Write `schedule.json`** — map each of the 24 slide PDFs to a lecture: `{lecture_id, week, order_index, title, topics, scheduled_date, slide_deck, exam?}`. Dates set to UC Berkeley Fall 2025 calendar (Tue/Thu, Sept 2 – Dec 2). Week 9 = break. Midterm flagged on lec 15, final on lec 24.
5. **Run `chunk_slides.py`** — extract text from each PDF with `pypdf`, tokenize with `tiktoken cl100k_base`, chunk into overlapping windows, and emit one JSON per lecture under `lectures/`.

**Result:** 141 chunks across 24 lectures.

## Deviations from `aristotle_srs.md`

The SRS was the spec; here's where we intentionally went off-spec or added detail it didn't cover.

### 1. Bundled-per-lecture JSON instead of one-doc-per-chunk files

**SRS implies** each `lecture_slide_chunk` doc is standalone (§13.2 shows one JSON object per chunk — the shape ChromaDB expects at `collection.add()` time).

**We did** bundle all chunks for a lecture into `lectures/lec_XX.json` under a `chunks: [...]` array.

**Why:** 143 tiny files is hostile to humans and diff tools. The loader flattens `lecture_doc.chunks → chromadb.add(...)` in one line — zero retrieval cost, much better dev ergonomics. Each chunk object inside still matches the SRS schema exactly.

### 2. Token-based sliding window (not LangChain's `RecursiveCharacterTextSplitter`)

**SRS §9.1** calls for `RecursiveCharacterTextSplitter` (character-based with separator heuristics).

**We did** use a pure token-based sliding window via `tiktoken` (500 tokens with 50-token overlap).

**Why:** Pre-shipped in Python stdlib-adjacent tooling, no LangChain dependency at mock-data generation time, and gives *exact* token counts (which the LLM actually consumes) rather than a character-count approximation. The loader can still re-chunk if needed.

### 3. Added `source_pages` (list) alongside `source_page` (int)

**SRS §13.2** specifies `metadata.source_page: int` only.

**We did** include both:
- `metadata.source_page` — the dominant page (most tokens from that chunk came from here)
- `metadata.source_pages` — full list of all page numbers the chunk spans

**Why:** A 500-token chunk frequently spans 4–7 slide pages. Keeping only a single int loses the actual provenance. The dominant-page heuristic preserves SRS compatibility; the list is additive, optional for consumers to use.

### 4. Added `chunk_type` heuristic (intro / body / summary)

**SRS §13.2** example shows `"chunk_type": "body"` but doesn't define the enum.

**We did** classify: first chunk = `"intro"`, last chunk = `"summary"`, middle = `"body"` (fallback to `"body"` if a lecture has ≤2 chunks).

**Why:** Cheap positional heuristic with no extra LLM cost. Enables filtered retrieval (e.g., "only pull intro chunks for a high-level summary"). Real semantic classification is a post-MVP upgrade.

### 5. Added `token_count` to chunk metadata

Not in SRS. Useful for context-budget math at retrieval time (knowing how many tokens a chunk will consume without re-encoding).

### 6. `doc_id` format includes semester

**SRS example:** `cs3000_lec02_slide_chunk_03`
**Ours:** `cs188_fall_2025_lec_01_slide_chunk_000`

**Why:** Course IDs in our system include semester (`cs188-fall-2025`), so doc_ids embed the full course identifier. Also bumped index padding to 3 digits — some lectures generate >10 chunks.

### 7. `schedule.json` is flatter than the SRS implies

**SRS** mentions a `schedule.json` at ingestion (FR-ING-01) but doesn't spec its shape.

**We did** define a flat structure: top-level semester dates + `lectures[]`. Each lecture entry is the *canonical source of truth* for lecture order, date, topics, and slide file — referenced from both `course.json` and the generated `lec_XX.json` files.

**Why:** Single source avoids drift. Removes `aima_chapters` and per-week assignment fields (out of scope for gameplay generation — those live in syllabus.md for humans).

### 8. Course metadata richer than SRS `Course` entity

**SRS §7.1 `Course` model** has: `id`, `user_id`, `name`, `theme`, `syllabus_text`, `skills_graph`, `created_at`.

**We did** skip `user_id`, `theme`, and `skills_graph` (those are runtime/gameplay concerns, not part of static mock data) and added: `code`, `semester`, `university`, `department`, `units`, `faculty[]`, `lecture_count`, `textbook`, `grading{}`, `assessment{}`, `prerequisites[]`, `course_website`.

**Why:** Mock data should describe the course as it exists in the real world; gameplay state (theme, user) is attached at runtime. The extra fields support realistic UI (showing faculty, prerequisites, AIMA references) without breaking the SRS data model.

## Chunk Document Schema (final)

Each item in `lectures/lec_XX.json → chunks[]`:

```json
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
```

## Regenerating

```bash
cd cs188
python3 chunk_slides.py
```

Requires: `pypdf`, `tiktoken`. Idempotent — overwrites `lectures/*.json`. Safe to re-run after editing `schedule.json` or adjusting `CHUNK_SIZE` / `CHUNK_OVERLAP` constants.

## Numbers

| Metric | Value |
|---|---|
| Lectures | 24 |
| Total slide pages | 1,094 |
| Total chunks | 141 |
| Total tokens | ~66,300 |
| Avg chunks per lecture | 5.9 |
| Chunk size / overlap | 500 / 50 tokens |
