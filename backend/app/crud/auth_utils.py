from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import os
import httpx
import jwt
from ..crud import user_crud
from ..schemas import user_schema
from ..models import user_model
from datetime import datetime, timedelta

async def fetch_google_user_info(token: str):
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {token}"}
    response = await httpx.get(user_info_url, headers=headers)
    user_info = response.json()
    return user_info

async def handle_user_authentication(user_info: dict, db: Session):
    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing email in user information")

    # Check if user already exists
    existing_user = user_crud.get_user_by_email(db, email)
    if existing_user:
        # Existing user, generate session token
        session_token = generate_session_token(existing_user)
        return {"type": "existing", "session_token": session_token}
    else:
        # New user, return user_info for further processing
        return {"type": "new", "user_info": user_info}

def generate_session_token(user: user_model.User):
    payload = {
        "sub": user.id,  # subject, typically user's identifier
        "iat": datetime.utcnow(),  # issued at time
        "exp": datetime.utcnow() + timedelta(days=1)  # expiration time
    }
    return jwt.encode(payload, os.getenv("SECRET_KEY"), algorithm="HS256")

def generate_temp_token(user_info: dict):
    payload = {
        "user_info": user_info,
        "exp": datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    }
    return jwt.encode(payload, os.getenv("SECRET_KEY"), algorithm="HS256")

def validate_temp_token(token: str):
    try:
        decoded_token = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
        return decoded_token["user_info"]
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token