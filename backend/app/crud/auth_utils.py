from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..config import Config
from jose import jwt, JWTError
from ..crud import user_crud
from ..models import user_model
from ..dependencies import get_db
from datetime import datetime, timedelta
import httpx

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> user_model.User:
    print(f"Token:  {token}") # Debugging
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        print(f"Payload: {payload}") # Debugging
        user_id: str = payload.get("sub")
        print(f"User ID: {user_id}") # Debugging
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id) # Convert the subject (User ID) back to an int
    except JWTError as e:
        print(f"JWT Error: {e}")  # Debugging
        raise credentials_exception

    user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

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
        "sub": str(user.id),  # subject, typically user's identifier
        "iat": datetime.utcnow(),  # issued at time
        "exp": datetime.utcnow() + timedelta(days=1)  # expiration time
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def generate_temp_token(user_info: dict):
    payload = {
        "user_info": user_info,
        "exp": datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def validate_temp_token(token: str):
    try:
        decoded_token = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        return decoded_token["user_info"]
    except JWTError:
        return None