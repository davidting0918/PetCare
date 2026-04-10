import os

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from backend.models.auth import GoogleUserInfo


class GoogleAuthProvider:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        # Additional client IDs (e.g. iOS) that are allowed to authenticate
        ios_client_id = os.getenv("GOOGLE_IOS_CLIENT_ID")
        self.allowed_client_ids = [client_id]
        if ios_client_id:
            self.allowed_client_ids.append(ios_client_id)

    async def exchange_code_for_tokens(self, authorization_code: str, redirect_uri: str) -> dict:
        """Exchange authorization code for access token and ID token"""
        token_url = "https://oauth2.googleapis.com/token"

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": authorization_code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            return response.json()

    async def verify_token(self, token: str) -> GoogleUserInfo:
        # Try each allowed client ID (web, iOS, etc.)
        last_error = None
        for cid in self.allowed_client_ids:
            try:
                id_info = id_token.verify_oauth2_token(token, google_requests.Request(), cid)
                return GoogleUserInfo(
                    id=id_info["sub"], email=id_info["email"], name=id_info["name"], picture=id_info["picture"]
                )
            except Exception as e:
                last_error = e
                continue
        raise last_error
