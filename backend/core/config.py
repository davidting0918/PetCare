"""Environment-driven settings for the PetCare backend.

Auth-related settings (JWT, Google, Apple) are loaded eagerly here so a
missing required value crashes the process at startup rather than at the
first request that needs it.
"""

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv("backend/.env")


@dataclass
class Settings:
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    cors_origins: list[str] = field(default_factory=lambda: ["*"])

    # PostgreSQL
    postgres_uri: str = "postgresql://localhost:5432/petcare"

    # JWT
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 30

    # OAuth providers
    google_ios_client_id: str = ""
    google_web_client_id: str = ""
    apple_bundle_id: str = ""

    # Cloudinary (pet / food / user photo uploads)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    @property
    def google_allowed_audiences(self) -> list[str]:
        return [c for c in (self.google_ios_client_id, self.google_web_client_id) if c]

    @property
    def cloudinary_is_configured(self) -> bool:
        return bool(self.cloudinary_cloud_name and self.cloudinary_api_key and self.cloudinary_api_secret)


def _split_csv(value: str | None) -> list[str] | None:
    if not value:
        return None
    return [v.strip() for v in value.split(",") if v.strip()]


def load_settings() -> Settings:
    cors = _split_csv(os.getenv("CORS_ORIGINS")) or ["*"]
    return Settings(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        cors_origins=cors,
        postgres_uri=os.getenv("POSTGRES_URI", "postgresql://localhost:5432/petcare"),
        jwt_secret_key=os.getenv("JWT_SECRET_KEY", ""),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120")),
        refresh_token_expire_days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30")),
        google_ios_client_id=os.getenv("GOOGLE_IOS_CLIENT_ID", ""),
        google_web_client_id=os.getenv("GOOGLE_WEB_CLIENT_ID", ""),
        apple_bundle_id=os.getenv("APPLE_BUNDLE_ID", ""),
        cloudinary_cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        cloudinary_api_key=os.getenv("CLOUDINARY_API_KEY", ""),
        cloudinary_api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
    )


def validate_auth_settings(s: Settings) -> None:
    """Crash loudly at startup if a required auth env var is missing.

    Called once from `lifespan`. OAuth client IDs are optional (their absence
    just disables that login path), but a missing JWT secret means we can't
    issue ANY token, so we fail closed.
    """
    if not s.jwt_secret_key or s.jwt_secret_key.startswith("change-me"):
        raise RuntimeError(
            "JWT_SECRET_KEY is missing or still set to the placeholder. "
            "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
        )


settings = load_settings()
