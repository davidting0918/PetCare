"""Sign in with Apple ID-token verifier.

Apple gives the client a signed JWT (`identityToken`). Our job:
  1. Fetch Apple's JWKS (cached for 1 hour)
  2. Pick the JWK matching the JWT's `kid`
  3. Verify the JWT's signature, `iss`, `aud`, and `exp`
  4. Extract `sub` (Apple user id) and email

`aud` must equal our app's bundle id (set as APPLE_BUNDLE_ID).
Email may be absent from the JWT — Apple only includes it for some users.
The iOS client sends it separately on first sign-in, which `auth_service`
forwards in as `fallback_email`.
"""

import asyncio
import logging
import time

import httpx
from fastapi import HTTPException, status
from jose import jwt
from jose.exceptions import JWTError

from backend.core.config import settings
from backend.models.user import AppleUserInfo

logger = logging.getLogger(__name__)

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
JWKS_TTL_SECONDS = 3600


class AppleAuthProvider:
    def __init__(self, bundle_id: str | None = None):
        self._bundle_id = bundle_id or settings.apple_bundle_id
        self._jwks: dict | None = None
        self._jwks_fetched_at: float = 0.0
        self._lock = asyncio.Lock()

    @property
    def is_configured(self) -> bool:
        return bool(self._bundle_id)

    async def verify_token(
        self, identity_token: str, *, fallback_email: str | None = None
    ) -> AppleUserInfo:
        if not self._bundle_id:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Apple sign-in is not configured on this server",
            )

        try:
            unverified_header = jwt.get_unverified_header(identity_token)
        except JWTError as e:
            logger.info("Apple token has malformed header: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed Apple identity token"
            )

        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Apple identity token missing kid"
            )

        jwks = await self._get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            # JWKS rotated since last cache — refetch once.
            jwks = await self._get_jwks(force_refresh=True)
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Apple JWKS does not contain kid {kid}",
            )

        try:
            claims = jwt.decode(
                identity_token,
                key,
                algorithms=["RS256"],
                audience=self._bundle_id,
                issuer=APPLE_ISSUER,
                options={"verify_at_hash": False},
            )
        except JWTError as e:
            logger.info("Apple token verification failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple identity token"
            )

        return AppleUserInfo(
            sub=claims["sub"],
            email=claims.get("email") or fallback_email,
            is_private_email=bool(claims.get("is_private_email", False)),
            email_verified=bool(claims.get("email_verified", False)),
        )

    async def _get_jwks(self, *, force_refresh: bool = False) -> dict:
        async with self._lock:
            now = time.time()
            if (
                not force_refresh
                and self._jwks is not None
                and (now - self._jwks_fetched_at) < JWKS_TTL_SECONDS
            ):
                return self._jwks
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(APPLE_JWKS_URL)
                resp.raise_for_status()
                self._jwks = resp.json()
                self._jwks_fetched_at = now
                return self._jwks
