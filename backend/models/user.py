from datetime import datetime as dt
from typing import Optional

from pydantic import BaseModel, EmailStr

user_table = "users"


class User(BaseModel):
    id: str
    google_id: Optional[str] = None
    email: EmailStr
    picture: Optional[str] = ""
    hashed_pwd: str  # if login with google, then pwd default will be hashed google id
    name: str  # if login with google, then name default will be google name
    personal_group_id: Optional[str] = ""
    created_at: dt
    updated_at: dt
    source: str
    is_active: bool = True
    is_verified: bool = True


class UserInfo(BaseModel):
    id: str
    email: EmailStr
    name: str
    picture: Optional[str] = ""
    personal_group_id: str
    created_at: dt
    updated_at: dt
    source: str
    is_active: bool
    is_verified: bool


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    pwd: str


class UpdateUserInfoRequest(BaseModel):
    name: str
    picture: Optional[str] = ""  # not supported yet


class ResetPasswordRequest(BaseModel):
    old_pwd: str
    new_pwd: str
