import uuid
from datetime import datetime as dt

from fastapi import HTTPException

from backend.core.db_manager import get_db
from backend.models.auth import access_token_table, pwd_context
from backend.models.group import CreateGroupRequest
from backend.models.user import (
    CreateUserRequest,
    ResetPasswordRequest,
    UpdateUserInfoRequest,
    User,
    UserInfo,
    user_table,
)
from backend.services.group_service import GroupService


class UserService:
    def __init__(self):
        # No need to initialize database here - it's handled globally
        self.group_service = GroupService()

    @property
    def db(self):
        """Get database client from global manager"""
        return get_db()

    async def create_user(self, request: CreateUserRequest, key_info: dict) -> UserInfo:
        # first check if user already exists
        sql = f"""select * from {user_table} where email = '{request.email}'"""
        user_exists = await self.db.read_one(sql)
        if user_exists:
            raise HTTPException(status_code=400, detail="User already exists")

        # create user
        current_time = dt.now()
        user = User(
            id=str(uuid.uuid4())[:8],
            email=request.email,
            name=request.name,
            hashed_pwd=pwd_context.hash(request.pwd),
            created_at=current_time,
            updated_at=current_time,
            is_active=True,
            source=key_info["name"],
        )

        await self.db.insert_one(user_table, user.model_dump())

        personal_group = await self.group_service.create_group(CreateGroupRequest(name=request.name), user.id)

        sql = f"""
        update {user_table} set personal_group_id = '{personal_group.id}' where id = '{user.id}'
        """
        await self.db.execute(sql)

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

    async def update_user_info(self, request: UpdateUserInfoRequest, user_id: str) -> UserInfo:
        # first check if user exists
        sql = f"""
        select * from {user_table} where id = '{user_id}'
        """
        user_exists = await self.db.read_one(sql)
        if not user_exists:
            raise HTTPException(status_code=400, detail="User not found")

        # update user info
        sql = f"""
        update {user_table} set name = '{request.name}' where id = '{user_id}'
        """
        await self.db.execute(sql)

        sql = f"""
        select * from {user_table} where id = '{user_id}'
        """
        user_info = await self.db.read_one(sql)
        return UserInfo(**user_info)

    async def reset_password(self, request: ResetPasswordRequest, user_id: str) -> UserInfo:
        # first check if user exists
        sql = f"""
        select * from {user_table} where id = '{user_id}'
        """
        user_exists = await self.db.read_one(sql)
        if not user_exists:
            raise HTTPException(status_code=400, detail="User not found")

        # check old pwa match
        if not pwd_context.verify(request.old_pwd, user_exists["hashed_pwd"]):
            raise HTTPException(status_code=400, detail="Old password is incorrect")

        # hashed new pwd
        new_pwd_hash = pwd_context.hash(request.new_pwd)
        sql = f"""
        update {user_table} set hashed_pwd = '{new_pwd_hash}' where id = '{user_id}'
        """
        await self.db.execute(sql)

        # return user info
        sql = f"""
        select * from {user_table} where id = '{user_id}'
        """
        user_info = await self.db.read_one(sql)

        # clear all access token of this user
        sql = f"""
        delete from {access_token_table} where user_id = '{user_id}'
        """
        await self.db.execute(sql)

        return UserInfo(**user_info)
