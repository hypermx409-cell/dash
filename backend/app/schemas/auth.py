"""Auth request/response schemas."""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMe(BaseModel):
    id: str
    email: str
    username: str
    role: str | None = None
    is_active: bool
    is_verified: bool
    balance: int
    display_name: str | None = None
    discord_id: str | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    username: str | None = None
