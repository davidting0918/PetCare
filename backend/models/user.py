from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

user_collection = "users"

class User(BaseModel):
    id: str
    google_id: Optional[str] = ""
    email: EmailStr
    picture: Optional[str] = ""
    hashed_pwd: str  # if login with google, then pwd default will be hashed google id
    name: str  # if login with google, then name default will be google name
    group_ids: List[str] = Field(default_factory=list)  # List of group IDs user belongs to
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
    group_ids: List[str] = Field(default_factory=list)  # List of group IDs user belongs to  
    created_at: int
    updated_at: int
    source: str
    is_active: bool
    is_verified: bool


class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str
    pwd: str
