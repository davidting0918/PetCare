import os
from datetime import datetime as dt

from dotenv import load_dotenv
from fastapi.security import HTTPBearer, OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel

load_dotenv("backend/.env")

ACCESS_TOKEN_EXPIRE_MINUTES = 120
ALGORITHM = "HS256"
ACCESS_TOKEN_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

access_token_table = "access_tokens"
api_key_table = "api_keys"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/access_token")
# API Key security scheme
api_key_scheme = HTTPBearer()


class GoogleAuthRequest(BaseModel):
    code: str  # Authorization code from Google
    redirect_uri: str = None  # Redirect URI used for the OAuth flow


class GoogleUserInfo(BaseModel):
    id: str
    email: str
    name: str
    picture: str


class AccessToken(BaseModel):
    token: str
    user_id: str
    created_at: dt
    expires_at: dt
    is_active: bool = True


class EmailAuthRequest(BaseModel):
    email: str
    pwd: str


class APIKey(BaseModel):
    api_key: str
    api_secret: str
    name: str
    created_at: int
    is_active: bool = True
