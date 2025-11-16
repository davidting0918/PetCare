import os
import uuid
from datetime import datetime as dt
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile, status

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
        self.photo_storage_path = "backend/storage/user_photos"

        # Ensure photo storage directory exists
        os.makedirs(self.photo_storage_path, exist_ok=True)

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
        update_fields = []
        if request.name:
            update_fields.append(f"name = '{request.name}'")
        if request.picture:
            update_fields.append(f"picture = '{request.picture}'")

        if update_fields:
            update_fields.append(f"updated_at = '{dt.now()}'")
            sql = f"""
            update {user_table} set {', '.join(update_fields)} where id = '{user_id}'
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

    async def upload_user_photo(self, user_id: str, file: UploadFile) -> dict:
        """
        Upload a user profile photo

        Args:
            user_id: The ID of the user
            file: The uploaded file

        Returns:
            Dictionary containing photo information
        """
        # Verify user exists
        sql = f"""
        select * from {user_table} where id = '{user_id}'
        """
        user_exists = await self.db.read_one(sql)
        if not user_exists:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
            )

        # Read and validate file size
        content = await file.read()
        max_size = 10 * 1024 * 1024  # 10MB
        actual_size = len(content)

        if actual_size > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_size / 1024 / 1024}MB",
            )

        # Generate filename using user_id (deterministic naming)
        file_ext = Path(file.filename).suffix if file.filename else ".jpg"
        file_name = f"{user_id}{file_ext}"
        file_path = os.path.join(self.photo_storage_path, file_name)
        photo_url = f"/static/user_photos/{file_name}"

        # Delete old photo if it has a different extension
        # (same extension will be automatically overwritten)
        if user_exists.get("picture"):
            old_photo_url = user_exists["picture"]
            if old_photo_url.startswith("/static/user_photos/"):
                old_file_name = old_photo_url.split("/")[-1]
                # Only delete if it's a different file (different extension)
                if old_file_name != file_name:
                    old_file_path = os.path.join(self.photo_storage_path, old_file_name)
                    if os.path.exists(old_file_path):
                        try:
                            os.remove(old_file_path)
                        except Exception as e:
                            # Log but don't fail if old photo deletion fails
                            print(f"Warning: Could not delete old photo: {e}")

        try:
            # Save file to storage
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(content)

            # Update user record with photo URL
            sql = f"""
            UPDATE {user_table}
            SET picture = '{photo_url}', updated_at = '{dt.now()}'
            WHERE id = '{user_id}'
            """
            await self.db.execute(sql)

            return {
                "photo_url": photo_url,
                "photo_name": file_name,
                "photo_size": actual_size,
                "photo_type": file.content_type,
                "photo_uploaded_at": int(dt.now().timestamp()),
            }

        except Exception as e:
            # Clean up file if database operation fails
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload photo: {str(e)}"
            )
