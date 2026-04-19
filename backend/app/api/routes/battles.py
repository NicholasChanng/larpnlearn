"""MVP battle routes based on lecture JSON inputs (lec_{i}.json)."""

from __future__ import annotations

import base64
import json
import logging
import random
import time
from pathlib import Path

from fastapi import APIRouter, HTTPException
from openai import APITimeoutError, APIStatusError
from openai import LengthFinishReasonError
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel

from ...ai.validation_agent import validate_voice_answer
from ...ai.whisper import transcribe
from ...config import settings
from ...models import (
    GenerateQuestionsMetadata,
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    QuizQuestionMetadata,
    ValidateAnswerRequest,
    ValidateAnswerResponse,
)

router = APIRouter(prefix="/battles", tags=["battles"])
logger = logging.getLogger("uvicorn.error")
logger.setLevel(logging.INFO)


class _GeneratedQuestion(BaseModel):
    question_type: str
    content: str
    answer_choices: list[str] | None = None
    explanation_for_answer_choices: list[str] | None = None
    index_of_correct_answer: int | None = None
    response_requirements: list[str] | None = None
    topic: str


class _GeneratedQuestionBatch(BaseModel):
    question_data: list[_GeneratedQuestion]


async def _invoke_generation_batch(
    llm: ChatOpenAI,
    context: str,
    difficulty: int,
    difficulty_label: str,
    batch_count: int,
    batch_mcq_count: int,
    batch_voice_count: int,
) -> tuple[list[_GeneratedQuestion], int]:
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You generate structured quiz questions from lecture context. "
                "Avoid repeating the same exact topic unless necessary.",
            ),
            (
                "human",
                """Generate exactly {num_of_questions} questions with this mix:
- {mcq_count} mcq
- {voice_count} voice

Difficulty score is {difficulty} (0-10), interpreted as {difficulty_label}.

Rules:
- Voice questions must be answerable in 2-3 sentences.
- MCQ must have 4 answer choices.
- explanation_for_answer_choices must include one explanation per MCQ option.
- index_of_correct_answer must be 0..3 for MCQ.
- response_requirements should be a short checklist for voice questions.

Lecture context:
{context}
""",
            ),
        ]
    )

    chain = prompt | llm.with_structured_output(_GeneratedQuestionBatch)
    llm_start = time.perf_counter()
    try:
        generated: _GeneratedQuestionBatch = await chain.ainvoke(
            {
                "num_of_questions": batch_count,
                "mcq_count": batch_mcq_count,
                "voice_count": batch_voice_count,
                "difficulty": difficulty,
                "difficulty_label": difficulty_label,
                "context": context,
            }
        )
        llm_elapsed_ms = int((time.perf_counter() - llm_start) * 1000)
        return generated.question_data, llm_elapsed_ms
    except LengthFinishReasonError:
        llm_elapsed_ms = int((time.perf_counter() - llm_start) * 1000)
        if batch_count <= 1:
            raise

        left_count = batch_count // 2
        right_count = batch_count - left_count

        left_mcq = min(batch_mcq_count, (left_count + 1) // 2)
        right_mcq = max(0, batch_mcq_count - left_mcq)
        left_voice = left_count - left_mcq
        right_voice = right_count - right_mcq

        logger.info(
            "invoke_generation_batch:length_limit batch_count=%d splitting_into=%d+%d",
            batch_count,
            left_count,
            right_count,
        )

        left_questions, left_elapsed = await _invoke_generation_batch(
            llm=llm,
            context=context,
            difficulty=difficulty,
            difficulty_label=difficulty_label,
            batch_count=left_count,
            batch_mcq_count=left_mcq,
            batch_voice_count=left_voice,
        )
        right_questions, right_elapsed = await _invoke_generation_batch(
            llm=llm,
            context=context,
            difficulty=difficulty,
            difficulty_label=difficulty_label,
            batch_count=right_count,
            batch_mcq_count=right_mcq,
            batch_voice_count=right_voice,
        )

        return left_questions + right_questions, llm_elapsed_ms + left_elapsed + right_elapsed


def _normalize_lecture_id(raw_id: str) -> str:
    logger.info("normalize_lecture_id: raw_id=%s", raw_id)
    s = raw_id.strip().lower().replace("lecture_", "").replace("lec_", "")
    if s.isdigit():
        normalized = f"lec_{int(s):02d}"
        logger.info("normalize_lecture_id: normalized=%s", normalized)
        return normalized
    if s.startswith("lec") and s[3:].isdigit():
        normalized = f"lec_{int(s[3:]):02d}"
        logger.info("normalize_lecture_id: normalized=%s", normalized)
        return normalized
    if s.startswith("0") and s[1:].isdigit():
        normalized = f"lec_{int(s):02d}"
        logger.info("normalize_lecture_id: normalized=%s", normalized)
        return normalized
    if raw_id.startswith("lec_"):
        logger.info("normalize_lecture_id: passthrough=%s", raw_id)
        return raw_id
    raise HTTPException(status_code=400, detail=f"Invalid lecture_id format: {raw_id}")


def _lecture_file_path(lecture_id: str) -> Path:
    return settings.lecture_json_path / f"{lecture_id}.json"


def _load_lecture_payload(lecture_id: str) -> dict:
    file_path = _lecture_file_path(lecture_id)
    logger.info("load_lecture_payload: lecture_id=%s path=%s", lecture_id, file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Lecture JSON not found: {file_path.name}")
    try:
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        chunks = payload.get("chunks") or []
        logger.info(
            "load_lecture_payload: lecture_id=%s loaded title=%s chunks=%d",
            lecture_id,
            payload.get("title", ""),
            len(chunks),
        )
        return payload
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
                    "topic_hint": ", ".join(topics[:3]),
                },
            )
        )
    logger.info(
        "lecture_docs: lecture_id=%s docs=%d topics=%d",
        lecture_id,
        len(docs),
        len(topics),
    )
    return docs


def _build_retriever(docs: list[Document]):
    start = time.perf_counter()
    logger.info("build_retriever:start docs=%d", len(docs))
    embedding_fn = OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openai_api_key or None,
    )
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embedding_fn,
        collection_name=f"aristotle-mvp-{random.randint(100000, 999999)}",
    )
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    k = min(settings.retrieval_k, len(docs))
    logger.info("build_retriever:done k=%d elapsed_ms=%d", k, elapsed_ms)
    return vectorstore.as_retriever(search_kwargs={"k": k})


def _build_context(retrieved_docs: list[Document]) -> tuple[str, int, int]:
    snippets: list[str] = []
    total_chars = 0
    used_docs = 0

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
        used_docs += 1

    return "\n\n".join(snippets), total_chars, used_docs


def _difficulty_label(value: int) -> str:
    if value <= 3:
        return "easy"
    if value <= 7:
        return "medium"
    return "hard"


async def _generate_with_llm(
    lecture_payloads: list[dict],
    num_of_questions: int,
    difficulty: int,
) -> tuple[list[QuizQuestionMetadata], GenerateQuestionsMetadata]:
    total_start = time.perf_counter()
    logger.info(
        "generate_with_llm:start lecture_payloads=%d num_of_questions=%d difficulty=%d",
        len(lecture_payloads),
        num_of_questions,
        difficulty,
    )
    docs: list[Document] = []
    for payload in lecture_payloads:
        docs.extend(_lecture_docs(payload))
    logger.info("generate_with_llm:docs_assembled total_docs=%d", len(docs))

    retrieve_start = time.perf_counter()
    retriever = _build_retriever(docs)
    logger.info("generate_with_llm:retriever_created")
    retrieved_docs = await retriever.ainvoke("key lecture concepts and exam-style prompts")
    retrieve_elapsed_ms = int((time.perf_counter() - retrieve_start) * 1000)
    context, context_chars, context_docs_used = _build_context(retrieved_docs)
    logger.info(
        "generate_with_llm:retrieved_docs=%d context_docs_used=%d context_chars=%d retrieve_elapsed_ms=%d",
        len(retrieved_docs),
        context_docs_used,
        context_chars,
        retrieve_elapsed_ms,
    )

    mcq_count = (num_of_questions + 1) // 2
    voice_count = num_of_questions - mcq_count
    difficulty_label = _difficulty_label(difficulty)

    llm = ChatOpenAI(
        model="gpt-5-mini",
        api_key=settings.openai_api_key,
        max_tokens=4000,
        timeout=settings.generation_timeout_s,
    )
    max_questions_per_llm_call = 8
    remaining_mcq = mcq_count
    remaining_voice = voice_count
    remaining_total = num_of_questions
    generated_questions: list[_GeneratedQuestion] = []
    llm_elapsed_ms_total = 0
    llm_calls = 0

    logger.info(
        "generate_with_llm:llm_invoke_start model=gpt-5-mini timeout_s=%s requested_questions=%d",
        settings.generation_timeout_s,
        num_of_questions,
    )

    while remaining_total > 0:
        batch_count = min(max_questions_per_llm_call, remaining_total)
        batch_mcq_count = min(remaining_mcq, (batch_count + 1) // 2)
        batch_voice_count = batch_count - batch_mcq_count

        logger.info(
            "generate_with_llm:llm_batch_start call=%d batch_count=%d batch_mcq=%d batch_voice=%d",
            llm_calls + 1,
            batch_count,
            batch_mcq_count,
            batch_voice_count,
        )

        batch_questions, batch_llm_elapsed_ms = await _invoke_generation_batch(
            llm=llm,
            context=context,
            difficulty=difficulty,
            difficulty_label=difficulty_label,
            batch_count=batch_count,
            batch_mcq_count=batch_mcq_count,
            batch_voice_count=batch_voice_count,
        )

        llm_calls += 1
        llm_elapsed_ms_total += batch_llm_elapsed_ms
        generated_questions.extend(batch_questions)

        logger.info(
            "generate_with_llm:llm_batch_done call=%d generated_raw=%d llm_elapsed_ms=%d",
            llm_calls,
            len(batch_questions),
            batch_llm_elapsed_ms,
        )

        remaining_total -= batch_count
        remaining_mcq = max(0, remaining_mcq - batch_mcq_count)
        remaining_voice = max(0, remaining_voice - batch_voice_count)

    out: list[QuizQuestionMetadata] = []
    for idx, q in enumerate(generated_questions[:num_of_questions]):
        q_type = q.question_type if q.question_type in {"mcq", "voice"} else "mcq"
        out.append(
            QuizQuestionMetadata(
                id=idx,
                question_type=q_type,
                content=q.content,
                answer_choices=q.answer_choices if q_type == "mcq" else None,
                explanation_for_answer_choices=(
                    q.explanation_for_answer_choices if q_type == "mcq" else None
                ),
                index_of_correct_answer=q.index_of_correct_answer if q_type == "mcq" else None,
                response_requirements=q.response_requirements if q_type == "voice" else None,
                topic=q.topic,
            )
        )

    if len(out) < num_of_questions:
        raise HTTPException(
            status_code=502,
            detail=(
                "LLM returned fewer questions than requested; no fallback is enabled in strict agent mode."
            ),
        )

    total_elapsed_ms = int((time.perf_counter() - total_start) * 1000)
    logger.info(
        "generate_with_llm:done output_questions=%d total_elapsed_ms=%d",
        len(out),
        total_elapsed_ms,
    )

    metadata = GenerateQuestionsMetadata(
        total_elapsed_ms=total_elapsed_ms,
        retrieval_elapsed_ms=retrieve_elapsed_ms,
        llm_elapsed_ms=llm_elapsed_ms_total,
        retrieved_docs=len(retrieved_docs),
        context_chars=context_chars,
        timeout_s=settings.generation_timeout_s,
        llm_calls=llm_calls,
    )

    return out, metadata


def _resolve_mcq_choice_index(user_response: str, answer_choices: list[str]) -> int | None:
    cleaned = user_response.strip().lower()
    if cleaned.isdigit():
        idx = int(cleaned)
        if 0 <= idx < len(answer_choices):
            return idx
    if len(cleaned) == 1 and cleaned in {"a", "b", "c", "d"}:
        idx = ord(cleaned) - ord("a")
        if 0 <= idx < len(answer_choices):
            return idx
    for idx, choice in enumerate(answer_choices):
        if cleaned == choice.strip().lower():
            return idx
    return None


async def _transcribe_user_response(body: ValidateAnswerRequest) -> str:
    logger.info("transcribe_user_response:start question_type=%s", body.question_metadata.question_type)
    if body.question_metadata.question_type == "mcq":
        if not body.user_response:
            raise HTTPException(status_code=400, detail="MCQ user_response is required")
        logger.info("transcribe_user_response:mcq_passthrough")
        return body.user_response

    if body.user_response and body.user_response.strip():
        logger.info("transcribe_user_response:text_passthrough")
        return body.user_response.strip()

    if not body.audio_blob_b64:
        raise HTTPException(status_code=400, detail="Voice answer requires user_response or audio_blob_b64")

    try:
        audio_bytes = base64.b64decode(body.audio_blob_b64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 audio payload") from exc

    transcript = await transcribe(audio_bytes)
    if not transcript.strip():
        raise HTTPException(status_code=422, detail="Transcription produced empty response")
    logger.info("transcribe_user_response:audio_transcribed chars=%d", len(transcript))
    return transcript


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_questions(body: GenerateQuestionsRequest) -> GenerateQuestionsResponse:
    logger.info(
        "generate_questions:request lecture_ids=%s num_of_questions=%d difficulty=%d",
        body.lecture_ids,
        body.num_of_questions,
        body.difficulty,
    )
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is required for generation + embeddings. Fallback is disabled.",
        )

    normalized_ids = [_normalize_lecture_id(lecture_id) for lecture_id in body.lecture_ids]
    logger.info("generate_questions:normalized_ids=%s", normalized_ids)
    lecture_payloads = [_load_lecture_payload(lecture_id) for lecture_id in normalized_ids]
    logger.info("generate_questions:lecture_payloads_loaded count=%d", len(lecture_payloads))

    try:
        generated, metadata = await _generate_with_llm(
            lecture_payloads=lecture_payloads,
            num_of_questions=body.num_of_questions,
            difficulty=body.difficulty,
        )
    except APITimeoutError as exc:
        logger.exception("generate_questions:openai_timeout")
        raise HTTPException(
            status_code=504,
            detail=(
                "OpenAI request timed out while generating questions. "
                "Try fewer questions or retry in a moment."
            ),
        ) from exc
    except APIStatusError as exc:
        logger.exception("generate_questions:openai_status_error")
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI API error ({exc.status_code}): {exc.message}",
        ) from exc
    except LengthFinishReasonError as exc:
        logger.exception("generate_questions:openai_length_limit")
        raise HTTPException(
            status_code=502,
            detail=(
                "OpenAI response hit token length limits while generating questions. "
                "Try fewer questions or lower context size."
            ),
        ) from exc

    logger.info("generate_questions:success output_questions=%d", len(generated))

    return GenerateQuestionsResponse(
        question_data=generated,
        num_of_questions=body.num_of_questions,
        metadata=metadata,
    )


@router.post("/validate-answer", response_model=ValidateAnswerResponse)
async def validate_answer(body: ValidateAnswerRequest) -> ValidateAnswerResponse:
    logger.info("validate_answer:start question_type=%s", body.question_metadata.question_type)
    transcript = await _transcribe_user_response(body)
    metadata = body.question_metadata

    if metadata.question_type == "mcq":
        choices = metadata.answer_choices or []
        explanations = metadata.explanation_for_answer_choices or []
        correct_idx = metadata.index_of_correct_answer
        if not choices or correct_idx is None:
            raise HTTPException(status_code=422, detail="MCQ metadata missing answer choices or correct index")

        selected_idx = _resolve_mcq_choice_index(transcript, choices)
        if selected_idx is None:
            logger.info("validate_answer:mcq_unparseable transcript=%s", transcript)
            return ValidateAnswerResponse(
                feedback="Could not parse your answer choice. Use index 0-3, A-D, or exact choice text.",
                correct=False,
                transcript=transcript,
            )

        is_correct = selected_idx == correct_idx
        feedback = (
            explanations[selected_idx]
            if 0 <= selected_idx < len(explanations)
            else ("Correct choice." if is_correct else "Incorrect choice.")
        )
        logger.info("validate_answer:mcq_done selected_idx=%s correct=%s", selected_idx, is_correct)
        return ValidateAnswerResponse(feedback=feedback, correct=is_correct, transcript=transcript)

    try:
        logger.info("validate_answer:voice_llm_invoke transcript_preview=%r", transcript[:80])
        feedback, correct = await validate_voice_answer(transcript, metadata)
    except RuntimeError as exc:
        logger.exception("validate_answer:voice_runtime_error")
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except APITimeoutError as exc:
        logger.exception("validate_answer:voice_openai_timeout")
        raise HTTPException(
            status_code=504,
            detail="OpenAI request timed out while validating voice response.",
        ) from exc
    except APIStatusError as exc:
        logger.exception("validate_answer:voice_openai_status_error")
        raise HTTPException(
            status_code=502,
            detail=f"OpenAI API error ({exc.status_code}): {exc.message}",
        ) from exc
    except Exception as exc:
        logger.exception("validate_answer:voice_unexpected_error type=%s", type(exc).__name__)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during voice validation: {type(exc).__name__}: {exc}",
        ) from exc
    logger.info("validate_answer:voice_done correct=%s", correct)
    return ValidateAnswerResponse(feedback=feedback, correct=correct, transcript=transcript)
