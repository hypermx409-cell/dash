"""Application configuration loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "EUPHORIA PANEL"
    APP_ENV: str = "production"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # Security
    SECRET_KEY: str = Field(default="change-me-in-production", min_length=16)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    COOKIE_NAME: str = "dash0_access_token"
    COOKIE_SECURE: bool = False
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "lax"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://dash.vortexmc.indevs.in,http://gl4zer-1.tail2dbe27.ts.net:3000"

    # Database
    DATABASE_URL: str = "postgresql://dash0:dash0@postgres:5432/dash0"

    # Rate limiting
    RATE_LIMIT_DEFAULT: str = "100/minute"

    # Pterodactyl (server-side only)
    PTERO_PANEL_URL: str = ""
    PTERO_API_KEY: str = ""
    PTERO_DEFAULT_NODE_ID: int | None = None
    PTERO_DEFAULT_LOCATION_ID: int | None = None
    PTERO_DEFAULT_EGG_ID: int | None = None
    PTERO_DEFAULT_NEST_ID: int | None = None
    PTERO_DEFAULT_ALLOCATION_ID: int | None = None

    FRONTEND_URL: str = "http://localhost:3001"
    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    DISCORD_REDIRECT_URI: str = ""
    DISCORD_REWARD_COINS: int = 50

    _int_fields = {"PTERO_DEFAULT_NODE_ID", "PTERO_DEFAULT_LOCATION_ID", "PTERO_DEFAULT_EGG_ID", "PTERO_DEFAULT_NEST_ID", "PTERO_DEFAULT_ALLOCATION_ID", "MAX_SERVERS_PER_USER"}

    @field_validator("PTERO_DEFAULT_NODE_ID", "PTERO_DEFAULT_LOCATION_ID", "PTERO_DEFAULT_EGG_ID", "PTERO_DEFAULT_NEST_ID", "PTERO_DEFAULT_ALLOCATION_ID", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("MAX_SERVERS_PER_USER", mode="before")
    @classmethod
    def _max_default(cls, v):
        if v == "" or v is None:
            return 3
        return v

    # Admin seed
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    # Limits
    MAX_SERVERS_PER_USER: int = 3
    CLAIMS_ENABLED: bool = True
    REGISTRATION_ENABLED: bool = True
    MAINTENANCE_MODE: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
