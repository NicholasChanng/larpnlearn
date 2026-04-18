"""CourseDocument builders — stub.

Owner: Track-5. Per SRS 7.4 and 9.1 Stage 3, transform raw course inputs
into self-contained CourseDocument instances with a context-headered text
field:

    [From {course_name} Lecture {order_index}: {title}] {chunk_body}

See SRS 9.1.3 for expected doc counts per course.
"""

from ..enums import DocType
from ..models import CourseDocument


def build_context_header(course_name: str, lecture_order: int, lecture_title: str) -> str:
    return f"[From {course_name} Lecture {lecture_order}: {lecture_title}]"


def make_document(
    doc_id: str,
    course_id: str,
    doc_type: DocType,
    text: str,
    metadata: dict | None = None,
) -> CourseDocument:
    return CourseDocument(
        doc_id=doc_id,
        course_id=course_id,
        doc_type=doc_type,
        text=text,
        metadata=metadata or {},
    )
