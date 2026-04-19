"""OpenAI Whisper STT wrapper — stub.

Owner: Track-5. Called by the /battles/{id}/answer endpoint when
audio_blob_b64 is present. Decode base64 -> temp file -> whisper API.
"""

from __future__ import annotations

import logging
import tempfile
from pathlib import Path

from openai import OpenAI

from ..config import settings

logger = logging.getLogger(__name__)


def get_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


async def transcribe(audio_bytes: bytes) -> str:
    logger.info("whisper:transcribe_start audio_bytes=%d", len(audio_bytes))
    try:
        import whisper
    except ImportError as exc:
        logger.error("whisper:import_error — openai-whisper not installed")
        raise RuntimeError(
            "Local Whisper not installed. Install `openai-whisper` for voice transcription."
        ) from exc

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = Path(tmp.name)

    logger.info("whisper:temp_file_written path=%s", tmp_path)

    try:
        logger.info("whisper:loading_model model=base")
        model = whisper.load_model("base")
        logger.info("whisper:model_loaded starting_transcription")
        result = model.transcribe(str(tmp_path))
        text = result.get("text", "") if isinstance(result, dict) else ""
        logger.info("whisper:transcription_done chars=%d text_preview=%r", len(text), text[:80])
        return text.strip()
    finally:
        tmp_path.unlink(missing_ok=True)
        logger.info("whisper:temp_file_cleaned")
