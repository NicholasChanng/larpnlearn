"""Shared FastAPI dependencies.

MVP: no real auth. Every request resolves to the single demo user.
Track-4 owner can swap in real JWT verification here without touching routes.
"""

from ..mock_data import demo_user
from ..models import User


def get_current_user() -> User:
    return demo_user()
