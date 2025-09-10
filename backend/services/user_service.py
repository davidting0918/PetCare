from backend.core.database import MongoAsyncClient
from backend.models.user import CreateUserRequest, UserInfo, user_collection, User
from fastapi import HTTPException
import uuid
from datetime import datetime as dt
from datetime import timezone as tz
from backend.models.auth import pwd_context

class UserService:
    def __init__(self):
        self.db = MongoAsyncClient()

    async def create_user(self, request: CreateUserRequest, key_info: dict) -> UserInfo:
        # first check if user already exists
        user = await self.db.find_one(user_collection, {"email": request.email})
        if user:
            raise HTTPException(status_code=400, detail="User already exists")

        # create user
        user = User(
            id=str(uuid.uuid4())[:8],
            email=request.email,
            name=request.name,
            hashed_pwd=pwd_context.hash(request.pwd),
            created_at=int(dt.now(tz.utc).timestamp()),
            updated_at=int(dt.now(tz.utc).timestamp()),
            is_active=True,
            source=key_info["name"],
        )
        await self.db.insert_one(user_collection, user.model_dump())
        return UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at,
            updated_at=user.updated_at,
            is_active=user.is_active,
            is_verified=user.is_verified,
            source=user.source,
        )