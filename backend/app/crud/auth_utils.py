from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..config import Config
from jose import jwt, JWTError, ExpiredSignatureError
from ..crud import user_crud
from ..models import user_model
from ..dependencies import get_db
from ..utils.time import utc_now
from datetime import timedelta
import httpx

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def issue_registration_token(user_info: dict, stage: str = "initial"):
    # Registration tokens are temporary and last 1 hour
    expiration_time = timedelta(hours=1)

    payload = {
        "user_info": user_info,  # User's email or other identifier
        "exp": utc_now() + expiration_time,
        "iat": utc_now(),  # Issued at time,
        "stage": stage, # indicates current stage of registration
        "type": "registration"
    }

    # Sign the token with a secret key
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

    return token

def generate_tokens(user: user_model.User):
    access_token_expires = timedelta(minutes=15)  # Short lifespan for access token
    refresh_token_expires = timedelta(days=7)  # Longer lifespan for refresh token

    access_payload = {
        "sub": str(user.id),
        "type": "access",
        "exp": utc_now() + access_token_expires
    }
    refresh_payload = {
        "sub": str(user.id),
        "type": "refresh",
        "exp": utc_now() + refresh_token_expires
    }

    access_token = jwt.encode(access_payload, Config.SECRET_KEY, algorithm="HS256")
    refresh_token = jwt.encode(refresh_payload, Config.SECRET_KEY, algorithm="HS256")

    return access_token, refresh_token

def validate_refresh_token(token: str):
    try:
        decoded_token = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        print(f"Decoded token: {decoded_token}")
        if decoded_token.get("type") != "refresh":
            print("Token is not of type 'refresh'")
            return None
        return decoded_token
    except JWTError as e:
        print(f"JWT Error: {e}")
        return None
    
def validate_registration_token(token: str):
    try:
        decoded_token = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        if decoded_token.get("type") != "registration":
            return None
        return decoded_token["user_info"]
    except JWTError:
        return None

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> user_model.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None or payload.get("type") != "access":
            raise credentials_exception
        user_id = int(user_id)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"})
    except JWTError:
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

    existing_user = user_crud.get_user_by_email(db, email)
    if existing_user:
        access_token, refresh_token = generate_tokens(existing_user)
        return {"type": "existing", "access_token": access_token, "refresh_token": refresh_token}
    else:
        return {"type": "new", "user_info": user_info}
