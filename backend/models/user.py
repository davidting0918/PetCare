from typing import Optional

from pydantic import BaseModel, EmailStr

user_collection = "users"


class User(BaseModel):
    id: str
    google_id: Optional[str] = ""
    email: EmailStr
    picture: Optional[str] = ""
    hashed_pwd: str  # if login with google, then pwd default will be hashed google id
    name: str  # if login with google, then name default will be google name
    personal_group_id: str
    created_at: int
    updated_at: int
    source: str
    is_active: bool = True
    is_verified: bool = True


class UserInfo(BaseModel):
    id: str
    email: EmailStr
    name: str
    picture: Optional[str] = ""
    personal_group_id: str
    created_at: int
    updated_at: int
    source: str
    is_active: bool
    is_verified: bool


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    pwd: str
