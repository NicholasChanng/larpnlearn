"""Auth routes — MVP stub.

Real auth deferred per hackathon decision. These endpoints exist so the
frontend can call them without 404ing; they always resolve to the demo user.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from ..deps import get_current_user
from ...models import User

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str


class AuthResponse(BaseModel):
    token: str
    user: User


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest) -> AuthResponse:
    return AuthResponse(token="mock-token", user=get_current_user())


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest) -> AuthResponse:
    return AuthResponse(token="mock-token", user=get_current_user())


@router.get("/me", response_model=User)
def me() -> User:
    return get_current_user()
