from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..oauth2_config import OAuth2Config
from ..schemas import user_schema
from ..crud import user_crud
from ..dependencies import get_db
from typing import List
from urllib.parse import urlencode

router = APIRouter()

# User Endpoints

# User Authentication
@router.get("/auth/login")
async def login():
    try:
        query_params = {
            "response_type": "code",
            "client_id": OAuth2Config.client_id,
            "redirect_uri": OAuth2Config.callback_url,
            "scope": OAuth2Config.scope
        }
        auth_url = f"{OAuth2Config.authorize_url}?{urlencode(query_params)}"
        return {"url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Create a user
@router.post("/users/", response_model=user_schema.User)
def create_user(user: user_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = user_crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    
    db_email = user_crud.get_user_by_email(db, email=user.email)
    if db_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
    
    return user_crud.create_user(db=db, user=user)

# Get a user by ID
@router.get("/users/id/{user_id}", response_model=user_schema.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = user_crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

# Get a user by username
@router.get("/users/username/{username}", response_model=user_schema.User)
def read_user_by_username(username: str, db: Session = Depends(get_db)):
    db_user = user_crud.get_user_by_username(db, username=username)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

# Get a user by email
@router.get("/users/email/{email}", response_model=user_schema.User)
def read_user_by_email(email: str, db: Session = Depends(get_db)):
    db_user = user_crud.get_user_by_email(db, email=email)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return db_user

# Get a list of users with pagination
@router.get("/users/", response_model=List[user_schema.User])
def read_users(skip: int = Query(0, alias="skip"), limit: int = Query(10, alias="limit"), db: Session = Depends(get_db)):
    users = user_crud.get_users(db, skip=skip, limit=limit)
    return users
