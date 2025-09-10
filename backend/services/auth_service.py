import os
import uuid
from datetime import datetime as dt
from datetime import timedelta as td
from datetime import timezone as tz
from typing import Optional

from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt

from backend.services.google_auth_provider import GoogleAuthProvider
from backend.core.database import MongoAsyncClient
from backend.models.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ACCESS_TOKEN_SECRET_KEY,
    ALGORITHM,
    AccessToken,
    access_token_collection,
    oauth2_scheme,
    pwd_context,
    api_key_scheme,
    api_key_collection,
)
from backend.models.user import User, UserInfo, user_collection
from fastapi.security import HTTPAuthorizationCredentials

_db = MongoAsyncClient()

class AuthService:
    def __init__(self):
        self.db = _db
        self.google_provider = GoogleAuthProvider(
            client_id=os.getenv("GOOGLE_CLIENT_ID"), 
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
        )
        self.secret_key = ACCESS_TOKEN_SECRET_KEY
        self.algorithm = ALGORITHM
        self.access_token_expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def create_access_token(self, user_id: str):
        current_time = dt.now(tz.utc)
        expire = current_time + td(minutes=self.access_token_expire_minutes)

        to_encode = {
            "sub": user_id,
            "exp": expire,
        }

        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return AccessToken(
            token=encoded_jwt,
            user_id=user_id,
            created_at=int(current_time.timestamp()),
            expires_at=int(expire.timestamp()),
            is_active=True,
        )

    async def store_token(self, token: AccessToken):
        token_info = token.model_dump()
        await self.db.insert_one(access_token_collection, token_info)

    async def find_valid_token(self, user_id: str) -> Optional[AccessToken]:
        current_time = int(dt.now(tz.utc).timestamp())

        token_dict = await self.db.find_one(
            access_token_collection, 
            {"user_id": user_id, "expires_at": {"$gt": current_time}, "is_active": True}
        )

        if token_dict:
            return AccessToken(**token_dict)
        return None

    async def get_or_create_token(self, user_id: str) -> dict:
        existing_token = await self.find_valid_token(user_id)

        if existing_token:
            return {
                "access_token": existing_token.token,
                "token_type": "bearer",
            }
        else:
            access_token = self.create_access_token(user_id=user_id)
            await self.store_token(access_token)

            return {
                "access_token": access_token.token,
                "token_type": "bearer",
            }

    async def authenticate_google_user(self, authorization_code: str, redirect_uri: str = None) -> Optional[User]:
        google_user_info = await self.google_provider.verify_authorization_code(authorization_code, redirect_uri)

        user_dict = await self.db.find_one(
            user_collection, 
            {"$or": [{"email": google_user_info.email}, {"google_id": google_user_info.id}]}
        )

        if user_dict:
            user = User(**user_dict)

            if not user.google_id:
                await self.db.update_one(
                    user_collection,
                    {"id": user.id},
                    {"google_id": google_user_info.id, "updated_at": int(dt.now(tz.utc).timestamp()), "picture": google_user_info.picture},
                )
                user.google_id = google_user_info.id

            return user
        else:
            new_user = User(
                id=str(uuid.uuid4())[:8],
                google_id=google_user_info.id,
                email=google_user_info.email,
                hashed_pwd=self.get_password_hash(google_user_info.id),
                picture=google_user_info.picture,
                name=google_user_info.name,
                created_at=int(dt.now(tz.utc).timestamp()),
                updated_at=int(dt.now(tz.utc).timestamp()),
                source="google",
                is_active=True,
            )
            await self.db.insert_one(user_collection, new_user.model_dump())
            return new_user

    def verify_password(self, password: str, hashed_pwd: str) -> bool:
        return pwd_context.verify(password, hashed_pwd)

    async def authenticate_user(self, name: str = None, email: str = None, password: str = None) -> Optional[User]:
        if name:
            user_dict = await self.db.find_one(user_collection, {"name": name})
        elif email:
            user_dict = await self.db.find_one(user_collection, {"email": email})
        else:
            raise ValueError("Either name or email must be provided")

        if not user_dict:
            return None

        user = User(**user_dict)
        if not self.verify_password(password, user.hashed_pwd):
            return None
        return user

    async def verify_user(self, user_id: str) -> bool:
        return

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInfo:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, ACCESS_TOKEN_SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user_dict = await _db.find_one(user_collection, {"id": user_id})
    if user_dict is None:
        raise credentials_exception

    return UserInfo(
        id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        created_at=user_dict["created_at"],
        updated_at=user_dict["updated_at"],
        source=user_dict["source"],
        is_active=user_dict["is_active"],
        is_verified=user_dict["is_verified"],
        picture=user_dict["picture"],
    )
    
async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(api_key_scheme)) -> dict:
    """
    Dependency function to verify API key and secret from request headers
    Expects Authorization header with Bearer token containing "key:secret"
    """
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key required")

    try:
        # Extract key and secret from Bearer token (format: "key:secret")
        token = credentials.credentials
        if ":" not in token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key format")

        provided_key, provided_secret = token.split(":", 1)

        # Get API key from database
        key = await _db.find_one(api_key_collection, {"api_key": provided_key})

        if not key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

        # Verify secret matches if provided
        if provided_secret and provided_secret != key["api_secret"]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key or secret")

        return {
            "api_key": key["api_key"],
            "name": key["name"],
        }

    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key format")
