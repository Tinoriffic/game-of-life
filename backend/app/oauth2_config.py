import os
from fastapi.security import OAuth2PasswordBearer

class OAuth2Config:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    token_url = "https://accounts.google.com/o/oauth2/token"
    authorize_url = "https://accounts.google.com/o/oauth2/auth"
    callback_url = "http://localhost:8000/auth/callback"
    scope = "openid email profile"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=OAuth2Config.token_url)
