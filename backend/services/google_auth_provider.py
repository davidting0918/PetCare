import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from backend.models.auth import GoogleUserInfo

class GoogleAuthProvider:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    async def exchange_code_for_tokens(self, authorization_code: str, redirect_uri: str = "postmessage") -> dict:
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

    async def verify_authorization_code(self, authorization_code: str, redirect_uri: str = None) -> GoogleUserInfo:
        """Exchange authorization code for tokens and verify ID token"""
        try:
            # Use provided redirect_uri or default to postmessage
            if not redirect_uri:
                redirect_uri = "postmessage"  # Default fallback
            
            # Exchange authorization code for tokens
            token_response = await self.exchange_code_for_tokens(authorization_code, redirect_uri)
            
            # Extract and verify ID token
            id_token_str = token_response.get("id_token")
            if not id_token_str:
                raise Exception("No ID token in response")
            
            id_info = id_token.verify_oauth2_token(id_token_str, google_requests.Request(), self.client_id)
            return GoogleUserInfo(
                id=id_info["sub"], 
                email=id_info["email"], 
                name=id_info["name"], 
                picture=id_info["picture"]
            )
        except Exception as e:
            raise e

    async def verify_token(self, token: str) -> GoogleUserInfo:
        """Legacy method for ID token verification (kept for backward compatibility)"""
        try:
            id_info = id_token.verify_oauth2_token(token, google_requests.Request(), self.client_id)
            return GoogleUserInfo(
                id=id_info["sub"], 
                email=id_info["email"], 
                name=id_info["name"], 
                picture=id_info["picture"]
            )
        except Exception as e:
            raise e