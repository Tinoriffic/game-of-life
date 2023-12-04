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

async def verify_and_register_user(user_info: dict, db: Session):
    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing email in user information")

    # Check if user already exists
    existing_user = user_crud.get_user_by_email(db, email)
    if existing_user:
        return existing_user

    # Create a new user
    user_data = user_schema.UserCreate(
        # TODO: It would be nice if the user can choose their username if registering through google for the 1st time
        username=email.split('@')[0],
        email=email,
        password=None,  # Password is not needed for OAuth users
        first_name=user_info.get("given_name"),
        last_name=user_info.get("family_name")
    )
    new_user = user_crud.create_user(db, user_data)
    return new_user

def generate_session_token(user: user_model.User):
    payload = {
        "sub": user.id,  # subject, typically user's identifier
        "iat": datetime.utcnow(),  # issued at time
        "exp": datetime.utcnow() + timedelta(days=1)  # expiration time
    }
    return jwt.encode(payload, os.getenv("SECRET_KEY"), algorithm="HS256")