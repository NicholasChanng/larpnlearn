"""OpenAI Whisper STT wrapper — stub.

Owner: Track-5. Called by the /battles/{id}/answer endpoint when
audio_blob_b64 is present. Decode base64 -> temp file -> whisper API.
"""

from openai import OpenAI

from ..config import settings


def get_client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


async def transcribe(audio_bytes: bytes) -> str:
    raise NotImplementedError("Track-5: implement Whisper transcription")
