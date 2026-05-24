"""Google Sign-In ID token verifier.

The iOS client gets an ID token from the Google Sign-In SDK and posts it to
`/auth/google/login`. We verify the signature against Google's certs and
return a normalized GoogleUserInfo.
"""

import logging

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from backend.core.config import settings
from backend.models.user import GoogleUserInfo

logger = logging.getLogger(__name__)


class GoogleAuthProvider:
    def __init__(self, allowed_audiences: list[str] | None = None):
        self._allowed_audiences = allowed_audiences or settings.google_allowed_audiences

    @property
    def is_configured(self) -> bool:
        return bool(self._allowed_audiences)

    async def verify_token(self, token: str) -> GoogleUserInfo:
        if not self._allowed_audiences:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google sign-in is not configured on this server",
            )

        last_error: Exception | None = None
        for audience in self._allowed_audiences:
            try:
                claims = id_token.verify_oauth2_token(token, google_requests.Request(), audience)
                return GoogleUserInfo(
                    sub=claims["sub"],
                    email=claims["email"],
                    name=claims.get("name") or claims["email"].split("@")[0],
                    picture=claims.get("picture"),
                )
            except Exception as e:
                last_error = e
                continue

        logger.info("Google token verification failed for all audiences: %s", last_error)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google ID token"
        )
