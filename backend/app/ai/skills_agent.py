"""Skills DAG + insight agent backed by lecture JSON RAG."""

from __future__ import annotations

import json
import logging
import random
import re
import time
from pathlib import Path

from fastapi import HTTPException
from openai import LengthFinishReasonError
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, Field

from ..config import settings
from ..models import (
    SkillDagEdge,
    SkillDagGraph,
    SkillDagNode,
    SkillInsightAddon,
    SkillInsightResponse,
    SkillInsightVisualization,
    SkillsGraphMetadata,
)

logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)


class _LlmSkillNode(BaseModel):
    id: str
    label: str
    description: str = ""
    level: int = Field(ge=0)
    lecture_refs: list[str] = Field(default_factory=list)


class _LlmSkillEdge(BaseModel):
    source: str
    target: str
    rationale: str


class _LlmSkillGraph(BaseModel):
    nodes: list[_LlmSkillNode]
    edges: list[_LlmSkillEdge]


class _LlmInsightAddon(BaseModel):
    type: str
    title: str
    content: str


class _LlmSkillInsight(BaseModel):
    summary: list[str] = Field(default_factory=list)
    pseudocode: str | None = None
    visualization_type: str | None = None
    visualization_content: str | None = None
    addons: list[_LlmInsightAddon] = Field(default_factory=list)


def _normalize_lecture_id(raw_id: str) -> str:
    s = raw_id.strip().lower().replace("lecture_", "").replace("lec_", "")
    if s.isdigit():
        return f"lec_{int(s):02d}"
    if s.startswith("lec") and s[3:].isdigit():
        return f"lec_{int(s[3:]):02d}"
    if raw_id.startswith("lec_"):
        return raw_id
    raise HTTPException(status_code=400, detail=f"Invalid lecture_id format: {raw_id}")


def _lecture_file_path(lecture_id: str) -> Path:
    return settings.lecture_json_path / f"{lecture_id}.json"


def _load_lecture_payload(lecture_id: str) -> dict:
    file_path = _lecture_file_path(lecture_id)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Lecture JSON not found: {file_path.name}")
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Malformed lecture JSON: {file_path.name}") from exc


def _lecture_docs(payload: dict) -> list[Document]:
    lecture_id = payload.get("lecture_id", "unknown")
    title = payload.get("title", "Untitled Lecture")
    topics = payload.get("topics") or []
    chunks = payload.get("chunks") or []

    docs = [
        Document(
            page_content=f"Lecture {lecture_id}: {title}\nTopics: {', '.join(topics)}",
            metadata={"lecture_id": lecture_id, "chunk_type": "overview"},
        )
    ]
    for chunk in chunks:
        docs.append(
            Document(
                page_content=chunk.get("text", ""),
                metadata={
                    "lecture_id": lecture_id,
                    "chunk_type": chunk.get("metadata", {}).get("chunk_type", "body"),
                },
            )
        )
    return docs


def _build_retriever(docs: list[Document]):
    embedding_fn = OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openai_api_key or None,
    )
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embedding_fn,
        collection_name=f"aristotle-skills-{random.randint(100000, 999999)}",
    )
    k = min(settings.retrieval_k, len(docs))
    return vectorstore.as_retriever(search_kwargs={"k": k})


def _build_context(retrieved_docs: list[Document]) -> tuple[str, int]:
    snippets: list[str] = []
    total_chars = 0

    for doc in retrieved_docs:
        if total_chars >= settings.max_context_chars:
            break
        snippet = doc.page_content[: settings.max_context_chunk_chars]
        if not snippet:
            continue
        remaining = settings.max_context_chars - total_chars
        clipped = snippet[:remaining]
        snippets.append(clipped)
        total_chars += len(clipped)

    return "\n\n".join(snippets), total_chars


def _slugify(raw: str) -> str:
    lowered = raw.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "_", lowered).strip("_")
    return normalized or f"skill_{random.randint(1000, 9999)}"


def _compute_mastered_skills(nodes: list[_LlmSkillNode], mastered_lecture_ids: set[str]) -> set[str]:
    mastered: set[str] = set()
    for node in nodes:
        refs = {_normalize_lecture_id(ref) for ref in node.lecture_refs if ref}
        if refs & mastered_lecture_ids:
            mastered.add(_slugify(node.id or node.label))
    return mastered


def _build_fallback_graph_from_lectures(
    course_id: str,
    lecture_payloads: list[dict],
    mastered_lecture_ids: set[str],
) -> SkillDagGraph:
    nodes: list[SkillDagNode] = []
    edges: list[SkillDagEdge] = []

    node_by_id: dict[str, SkillDagNode] = {}
    lecture_to_node_ids: dict[str, list[str]] = {}

    sorted_payloads = sorted(lecture_payloads, key=lambda p: p.get("order_index", 10_000))

    for payload in sorted_payloads:
        lecture_id = payload.get("lecture_id", "")
        try:
            normalized_lecture_id = _normalize_lecture_id(lecture_id)
        except HTTPException:
            continue

        topics = payload.get("topics") or []
        if not topics:
            title = payload.get("title", "")
            if title:
                topics = [title]

        topics = topics[:4]
        lecture_base_level = max(0, int(payload.get("order_index", 1)) - 1) * 2
        lecture_node_ids: list[str] = []

        for topic_idx, topic in enumerate(topics):
            node_id = _slugify(topic)
            topic_level = lecture_base_level + (0 if topic_idx == 0 else 1)
            if node_id not in node_by_id:
                status = "mastered" if normalized_lecture_id in mastered_lecture_ids else "locked"
                mastery_signals = [f"completed_{normalized_lecture_id}"] if status == "mastered" else []
                node_by_id[node_id] = SkillDagNode(
                    id=node_id,
                    label=topic,
                    level=topic_level,
                    status=status,
                    lecture_refs=[normalized_lecture_id],
                    mastery_signals=mastery_signals,
                )
            else:
                existing = node_by_id[node_id]
                if normalized_lecture_id not in existing.lecture_refs:
                    existing.lecture_refs.append(normalized_lecture_id)
                if normalized_lecture_id in mastered_lecture_ids and existing.status != "mastered":
                    existing.status = "mastered"
                    existing.mastery_signals.append(f"completed_{normalized_lecture_id}")
                existing.level = min(existing.level, topic_level)

            lecture_node_ids.append(node_id)

        lecture_to_node_ids[normalized_lecture_id] = lecture_node_ids

    lecture_ids_in_order = [
        _normalize_lecture_id(payload.get("lecture_id", ""))
        for payload in sorted_payloads
        if payload.get("lecture_id")
    ]

    seen_edges: set[tuple[str, str]] = set()

    def _add_edge(source: str, target: str, rationale: str) -> None:
        if source == target:
            return
        pair = (source, target)
        if pair in seen_edges:
            return
        if source not in node_by_id or target not in node_by_id:
            return
        if node_by_id[source].level >= node_by_id[target].level:
            node_by_id[target].level = node_by_id[source].level + 1
        seen_edges.add(pair)
        edges.append(
            SkillDagEdge(
                id=f"e_fb_{len(edges)}_{source}_{target}",
                source=source,
                target=target,
                rationale=rationale,
            )
        )

    for lecture_id in lecture_ids_in_order:
        lecture_nodes = lecture_to_node_ids.get(lecture_id, [])
        if len(lecture_nodes) <= 1:
            continue

        anchor = lecture_nodes[0]
        for branch_node in lecture_nodes[1:]:
            _add_edge(anchor, branch_node, "Sub-concept branch from lecture foundation")

    for idx in range(len(lecture_ids_in_order) - 1):
        curr_lecture_nodes = lecture_to_node_ids.get(lecture_ids_in_order[idx], [])
        next_lecture_nodes = lecture_to_node_ids.get(lecture_ids_in_order[idx + 1], [])

        if not curr_lecture_nodes or not next_lecture_nodes:
            continue

        _add_edge(
            curr_lecture_nodes[0],
            next_lecture_nodes[0],
            "Core prerequisite progression",
        )

        for branch_idx in range(1, min(len(curr_lecture_nodes), len(next_lecture_nodes))):
            _add_edge(
                curr_lecture_nodes[branch_idx],
                next_lecture_nodes[branch_idx],
                "Parallel branch progression",
            )

    nodes = list(node_by_id.values())
    nodes.sort(key=lambda n: (n.level, n.label.lower()))
    max_level = max((node.level for node in nodes), default=0)

    return SkillDagGraph(
        course_id=course_id,
        nodes=nodes,
        edges=edges,
        max_level=max_level,
    )


async def build_skills_graph(
    course_id: str,
    lecture_ids: list[str],
    mastered_lecture_ids: list[str],
) -> tuple[SkillDagGraph, SkillsGraphMetadata]:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for skills graph generation.")
    if not lecture_ids:
        raise HTTPException(status_code=400, detail="lecture_ids is required")

    total_start = time.perf_counter()
    normalized_ids = [_normalize_lecture_id(lecture_id) for lecture_id in lecture_ids]
    mastered_ids = {_normalize_lecture_id(lecture_id) for lecture_id in mastered_lecture_ids}

    lecture_payloads = [_load_lecture_payload(lecture_id) for lecture_id in normalized_ids]
    docs: list[Document] = []
    for payload in lecture_payloads:
        docs.extend(_lecture_docs(payload))

    retrieve_start = time.perf_counter()
    retriever = _build_retriever(docs)
    retrieved_docs = await retriever.ainvoke(
        "Build prerequisite concept DAG from foundational to advanced topics for this course"
    )
    retrieval_elapsed_ms = int((time.perf_counter() - retrieve_start) * 1000)
    context, context_chars = _build_context(retrieved_docs)

    llm = ChatOpenAI(
        model="gpt-5-mini",
        api_key=settings.openai_api_key,
        max_tokens=2000,
        timeout=settings.generation_timeout_s,
    )

    standard_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a curriculum graph planner. Return only valid DAG content. "
                "Assign level 0 to most foundational concepts and increase levels by prerequisite depth. "
                "No cycles. Keep nodes reusable and non-duplicative.",
            ),
            (
                "human",
                """Generate a compact concept DAG for course_id={course_id}.

Requirements:
- Produce 8-16 concept nodes.
- Each node has id, label, description, level, lecture_refs.
- Keep description <= 14 words.
- Edges must point from foundational -> more advanced.
- Keep rationale <= 12 words.
- Use lecture ids from this set when possible: {lecture_ids}

Context:
{context}
""",
            ),
        ]
    )
    compact_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a curriculum graph planner. Return only valid DAG content. "
                "No cycles. Keep output short and minimal.",
            ),
            (
                "human",
                """Generate a minimal concept DAG for course_id={course_id}.

Hard limits:
- Exactly 8-10 nodes.
- Maximum 12 edges.
- Node description <= 8 words.
- Edge rationale <= 8 words.
- Use only most essential concepts.

Lecture ids: {lecture_ids}
Context:
{context}
""",
            ),
        ]
    )

    llm_start = time.perf_counter()
    generated: _LlmSkillGraph | None = None
    try:
        standard_chain = standard_prompt | llm.with_structured_output(_LlmSkillGraph)
        generated = await standard_chain.ainvoke(
            {
                "course_id": course_id,
                "lecture_ids": ", ".join(normalized_ids),
                "context": context,
            }
        )
    except LengthFinishReasonError:
        logger.info("skills_graph:length_limit_retry_compact")
        try:
            compact_chain = compact_prompt | llm.with_structured_output(_LlmSkillGraph)
            compact_context = context[:2500]
            generated = await compact_chain.ainvoke(
                {
                    "course_id": course_id,
                    "lecture_ids": ", ".join(normalized_ids),
                    "context": compact_context,
                }
            )
        except LengthFinishReasonError:
            logger.info("skills_graph:length_limit_fallback")
    llm_elapsed_ms = int((time.perf_counter() - llm_start) * 1000)

    if generated is None:
        fallback_graph = _build_fallback_graph_from_lectures(
            course_id=course_id,
            lecture_payloads=lecture_payloads,
            mastered_lecture_ids=mastered_ids,
        )
        total_elapsed_ms = int((time.perf_counter() - total_start) * 1000)
        metadata = SkillsGraphMetadata(
            total_elapsed_ms=total_elapsed_ms,
            retrieval_elapsed_ms=retrieval_elapsed_ms,
            llm_elapsed_ms=llm_elapsed_ms,
            retrieved_docs=len(retrieved_docs),
            context_chars=context_chars,
        )
        return fallback_graph, metadata

    normalized_nodes: list[SkillDagNode] = []
    seen_node_ids: set[str] = set()
    mastered_skill_ids = _compute_mastered_skills(generated.nodes, mastered_ids)

    for node in generated.nodes:
        node_id = _slugify(node.id or node.label)
        if node_id in seen_node_ids:
            continue
        seen_node_ids.add(node_id)

        refs = []
        for ref in node.lecture_refs:
            try:
                refs.append(_normalize_lecture_id(ref))
            except HTTPException:
                continue

        status = "mastered" if node_id in mastered_skill_ids else "locked"
        mastery_signals = [f"completed_{ref}" for ref in refs if ref in mastered_ids]

        normalized_nodes.append(
            SkillDagNode(
                id=node_id,
                label=node.label.strip() or node_id,
                level=max(0, node.level),
                status=status,
                lecture_refs=refs,
                mastery_signals=mastery_signals,
            )
        )

    level_by_id = {node.id: node.level for node in normalized_nodes}
    normalized_edges: list[SkillDagEdge] = []
    seen_edges: set[tuple[str, str]] = set()

    for idx, edge in enumerate(generated.edges):
        source = _slugify(edge.source)
        target = _slugify(edge.target)
        if source not in level_by_id or target not in level_by_id:
            continue
        if source == target:
            continue
        if level_by_id[source] >= level_by_id[target]:
            continue
        pair = (source, target)
        if pair in seen_edges:
            continue
        seen_edges.add(pair)
        normalized_edges.append(
            SkillDagEdge(
                id=f"e_{idx}_{source}_{target}",
                source=source,
                target=target,
                rationale=edge.rationale,
            )
        )

    if not normalized_nodes:
        raise HTTPException(status_code=502, detail="Skills agent produced an empty graph")

    normalized_nodes.sort(key=lambda n: (n.level, n.label.lower()))
    max_level = max(node.level for node in normalized_nodes)

    total_elapsed_ms = int((time.perf_counter() - total_start) * 1000)
    metadata = SkillsGraphMetadata(
        total_elapsed_ms=total_elapsed_ms,
        retrieval_elapsed_ms=retrieval_elapsed_ms,
        llm_elapsed_ms=llm_elapsed_ms,
        retrieved_docs=len(retrieved_docs),
        context_chars=context_chars,
    )

    logger.info(
        "skills_graph:done nodes=%d edges=%d mastered=%d total_elapsed_ms=%d",
        len(normalized_nodes),
        len(normalized_edges),
        sum(1 for node in normalized_nodes if node.status == "mastered"),
        total_elapsed_ms,
    )

    return (
        SkillDagGraph(
            course_id=course_id,
            nodes=normalized_nodes,
            edges=normalized_edges,
            max_level=max_level,
        ),
        metadata,
    )


async def build_skill_insight(
    skill_id: str,
    course_id: str,
    lecture_ids: list[str],
) -> SkillInsightResponse:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for skill insights.")
    if not lecture_ids:
        raise HTTPException(status_code=400, detail="lecture_ids is required")

    normalized_ids = [_normalize_lecture_id(lecture_id) for lecture_id in lecture_ids]
    lecture_payloads = [_load_lecture_payload(lecture_id) for lecture_id in normalized_ids]

    docs: list[Document] = []
    for payload in lecture_payloads:
        docs.extend(_lecture_docs(payload))

    retriever = _build_retriever(docs)
    retrieved_docs = await retriever.ainvoke(
        f"Explain concept {skill_id} with concise summary, pseudocode, and useful visualization"
    )
    context, _ = _build_context(retrieved_docs)

    llm = ChatOpenAI(
        model="gpt-5-mini",
        api_key=settings.openai_api_key,
        max_tokens=1800,
        timeout=settings.generation_timeout_s,
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an AI tutor. Keep explanations concise and practical. "
                "Choose add-ons that genuinely help understanding.",
            ),
            (
                "human",
                """Create a concise skill insight for concept {skill_id} in course {course_id}.

Required output:
- summary: 2-4 bullets
- pseudocode: optional, include when algorithmic
- visualization_type + visualization_content: optional, include mermaid or text diagram when helpful
- addons: optional additional aids judged useful by you

Context:
{context}
""",
            ),
        ]
    )
    chain = prompt | llm.with_structured_output(_LlmSkillInsight)

    insight: _LlmSkillInsight = await chain.ainvoke(
        {
            "skill_id": skill_id,
            "course_id": course_id,
            "context": context,
        }
    )

    visualization = None
    if insight.visualization_type and insight.visualization_content:
        visualization = SkillInsightVisualization(
            type=insight.visualization_type,
            content=insight.visualization_content,
        )

    addons = [
        SkillInsightAddon(type=item.type, title=item.title, content=item.content)
        for item in insight.addons
    ]

    return SkillInsightResponse(
        skill_id=skill_id,
        summary=insight.summary or ["No summary generated."],
        pseudocode=insight.pseudocode,
        visualization=visualization,
        addons=addons,
    )
