"""Extract text from CS188 slide PDFs, chunk with accurate source_page tracking,
and emit JSON per lecture where each chunk conforms to the SRS lecture_slide_chunk spec."""
import json
import re
from pathlib import Path
from pypdf import PdfReader
import tiktoken

BASE = Path("/Users/sainellutla/Documents/Github/mock_data/cs188")
SLIDES_DIR = BASE / "slides"
LECTURES_DIR = BASE / "lectures"
SCHEDULE_PATH = BASE / "schedule.json"
COURSE_PATH = BASE / "course.json"

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

enc = tiktoken.get_encoding("cl100k_base")


def extract_pages(pdf_path: Path) -> list[dict]:
    """Return [{page_number, text, tokens, token_start, token_end}, ...]."""
    reader = PdfReader(str(pdf_path))
    pages = []
    token_cursor = 0
    for i, page in enumerate(reader.pages):
        raw = page.extract_text() or ""
        text = re.sub(r"\s+", " ", raw).strip()
        tokens = enc.encode(text) if text else []
        pages.append({
            "page_number": i + 1,
            "text": text,
            "tokens": tokens,
            "token_start": token_cursor,
            "token_end": token_cursor + len(tokens),
        })
        token_cursor += len(tokens)
    return pages


def build_token_stream(pages: list[dict]) -> list[int]:
    """Concatenate all page tokens into one stream (matching extract_pages offsets)."""
    stream = []
    for p in pages:
        stream.extend(p["tokens"])
    return stream


def pages_for_range(pages: list[dict], tok_start: int, tok_end: int) -> list[int]:
    """Return page_numbers whose token range overlaps [tok_start, tok_end)."""
    touched = []
    for p in pages:
        if p["token_end"] <= tok_start or p["token_start"] >= tok_end:
            continue
        if p["token_end"] > p["token_start"]:
            touched.append(p["page_number"])
    return touched


def dominant_page(pages: list[dict], tok_start: int, tok_end: int) -> int:
    """Return page_number that contains the most tokens in [tok_start, tok_end)."""
    best_page = pages[0]["page_number"]
    best_overlap = 0
    for p in pages:
        overlap = max(0, min(p["token_end"], tok_end) - max(p["token_start"], tok_start))
        if overlap > best_overlap:
            best_overlap = overlap
            best_page = p["page_number"]
    return best_page


def classify_chunk(chunk_index: int, total_chunks: int) -> str:
    """Assign chunk_type. Minimal heuristic — first=intro, last=summary, rest=body."""
    if total_chunks <= 2:
        return "body"
    if chunk_index == 0:
        return "intro"
    if chunk_index == total_chunks - 1:
        return "summary"
    return "body"


def chunk_lecture(pages: list[dict], course_id: str, lecture_id: str,
                  lecture_title: str, course_code: str, lecture_order: int) -> list[dict]:
    """Chunk the token stream and return SRS-compliant chunk docs."""
    stream = build_token_stream(pages)
    if not stream:
        return []

    step = CHUNK_SIZE - CHUNK_OVERLAP
    spans = []  # list of (tok_start, tok_end)
    for start in range(0, len(stream), step):
        end = min(start + CHUNK_SIZE, len(stream))
        spans.append((start, end))
        if end >= len(stream):
            break

    header = f"[From {course_code} Lecture {lecture_order}: {lecture_title}]"
    total = len(spans)
    docs = []
    for i, (s, e) in enumerate(spans):
        body_text = enc.decode(stream[s:e]).strip()
        full_text = f"{header} {body_text}"
        touched = pages_for_range(pages, s, e)
        docs.append({
            "doc_id": f"{course_id.replace('-', '_')}_{lecture_id}_slide_chunk_{i:03d}",
            "course_id": course_id,
            "doc_type": "lecture_slide_chunk",
            "text": full_text,
            "metadata": {
                "course_id": course_id,
                "lecture_id": lecture_id,
                "chunk_index": i,
                "source_page": dominant_page(pages, s, e),
                "source_pages": touched,
                "chunk_type": classify_chunk(i, total),
                "token_count": e - s,
            },
        })
    return docs


def main():
    LECTURES_DIR.mkdir(exist_ok=True)
    schedule = json.loads(SCHEDULE_PATH.read_text())
    course = json.loads(COURSE_PATH.read_text())
    course_id = course["id"]
    course_code = course["code"]

    summary = []
    for lec in schedule["lectures"]:
        try:
            slide_path = BASE / lec["slide_deck"]
            pages = extract_pages(slide_path)
            lecture_id = f"lec_{lec['lecture_id']}"
            chunks = chunk_lecture(
                pages=pages,
                course_id=course_id,
                lecture_id=lecture_id,
                lecture_title=lec["title"],
                course_code=course_code,
                lecture_order=lec["order_index"],
            )

            lecture_doc = {
                "lecture_id": lecture_id,
                "order_index": lec["order_index"],
                "week": lec["week"],
                "title": lec["title"],
                "topics": lec["topics"],
                "scheduled_date": lec["scheduled_date"],
                "slide_deck": lec["slide_deck"],
                "exam": lec.get("exam"),
                "course_id": course_id,
                "slide_metadata": {
                    "page_count": len(pages),
                    "total_tokens": sum(len(p["tokens"]) for p in pages),
                    "pages": [
                        {"page_number": p["page_number"],
                         "token_count": len(p["tokens"]),
                         "char_count": len(p["text"])}
                        for p in pages
                    ],
                },
                "chunks": chunks,
            }

            out = LECTURES_DIR / f"lec_{lec['lecture_id']}.json"
            out.write_text(json.dumps(lecture_doc, indent=2))
            summary.append({
                "lecture_id": lec["lecture_id"],
                "pages": len(pages),
                "chunks": len(chunks),
            })
            print(f"  lec_{lec['lecture_id']}: {len(pages)} pages -> {len(chunks)} chunks")
        except Exception as e:
            print(f"  lec_{lec['lecture_id']}: ERROR {e}")

    print(f"\nTotal: {len(summary)} lectures, "
          f"{sum(s['chunks'] for s in summary)} chunks")


if __name__ == "__main__":
    main()
