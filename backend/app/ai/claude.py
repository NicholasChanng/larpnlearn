"""Anthropic Claude client wrapper.

Owner: Track-5. Add prompt caching per SRS 2.5 ("cache aggressively").
Retry with exponential backoff (NFR-REL-01: 3 attempts).
"""

from anthropic import Anthropic

from ..config import settings


def get_client() -> Anthropic:
    return Anthropic(api_key=settings.anthropic_api_key)
