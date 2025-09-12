import uuid
from datetime import datetime as dt
from datetime import timezone as tz

from fastapi import HTTPException

from backend.core.database import MongoAsyncClient
from backend.models.auth import pwd_context
from backend.models.group import CreateGroupRequest
from backend.models.user import CreateUserRequest, User, UserInfo, user_collection
from backend.services.group_service import GroupService


class UserService:
    def __init__(self):
        self.db = MongoAsyncClient()
        self.group_service = GroupService()

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

        personal_group = await self.group_service.create_group(CreateGroupRequest(name=request.name), user.id)

        await self.db.update_one(user_collection, {"id": user.id}, {"personal_group_id": personal_group.id})

        return UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            personal_group_id=personal_group.id,
            created_at=user.created_at,
            updated_at=user.updated_at,
            is_active=user.is_active,
            is_verified=user.is_verified,
            source=user.source,
        )
