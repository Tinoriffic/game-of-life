from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from ..oauth2_config import OAuth2Config
from ..models import user_model
from ..schemas import user_schema
from ..crud import user_crud, skill_crud
from ..auth import auth_utils
from ..dependencies import get_db
from typing import List, Dict
from urllib.parse import urlencode
from sqlalchemy.inspection import inspect

router = APIRouter()

# User Endpoints

# User Authentication
@router.get("/auth/login")
async def oauth_login():
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
    
# Email/password registration, step 1. Mirrors the Google callback's job
# (establish a verified-enough identity) and hands off to the SAME staged
# flow: registration token -> /user-setup -> finalize -> the same JWTs.
# Only the bcrypt hash ever enters the token; the plaintext is never stored.
@router.post("/auth/email-start")
async def email_registration_start(request: user_schema.EmailStartRequest, db: Session = Depends(get_db)):
    if user_crud.get_user_by_email(db, email=request.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="That email is already registered - sign in instead")

    registration_token = auth_utils.issue_registration_token({
        "email": request.email,
        "password_hash": user_crud.pwd_context.hash(request.password),
        "first_name": (request.first_name or "").strip(),
        "auth_method": "password",
    })
    return {"registration_token": registration_token}


# Email/password sign-in: same tokens as the OAuth flow, different credential.
@router.post("/auth/email-login")
async def email_login(request: user_schema.EmailLoginRequest, db: Session = Depends(get_db)):
    identifier = request.identifier.strip()
    user = (user_crud.get_user_by_email(db, email=identifier) if "@" in identifier
            else user_crud.get_user_by_username(db, username=identifier))

    if user and not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="This account signs in with Google")
    if not user or not user_crud.pwd_context.verify(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid email/username or password")

    access_token, refresh_token = auth_utils.generate_tokens(user)
    return {"access_token": access_token, "refresh_token": refresh_token}


# Create a useranme from first-time Google Log-in
@router.post("/set-username")
async def set_username(request: user_schema.SetUsernameRequest, db: Session = Depends(get_db)):
    # Validate the temporary token and extract user info
    user_info = auth_utils.validate_registration_token(request.token)
    if not user_info:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    
    if len(request.username) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be at least 4 characters long")

    # Check if the username is already taken
    if user_crud.get_user_by_username(db, username=request.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    # Generate session token for the new user. Field names differ by origin:
    # Google tokens carry given_name/picture, email-start tokens carry
    # first_name/password_hash
    registration_token = auth_utils.issue_registration_token({
        "username": request.username,
        "email": user_info["email"],
        "first_name": user_info.get("given_name") or user_info.get("first_name", ""),
        "last_name": user_info.get("family_name", ""),  # Default to empty string if no last name
        "avatar_url": user_info.get("picture"),
        "password_hash": user_info.get("password_hash"),
    }, stage="set_username")

    return {"registration_token": registration_token}

# Final step of the OAuth registration process
@router.post("/finalize-oauth-registration")
async def create_oauth_user(request: user_schema.CreateAccountRequest, db: Session = Depends(get_db)):
    # Validate the temporary token and extract user info
    user_info = auth_utils.validate_registration_token(request.temp_token)
    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid registration token")

    if len(request.occupation) < 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Occupation must be at least 4 characters long")
    
    if len(request.city) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="City must be at least 2 characters long")

    # Create a new user account
    user_data = user_schema.UserCreate(
        username=user_info["username"],
        email=user_info["email"],
        first_name=user_info["first_name"],
        last_name=user_info["last_name"],
        occupation=request.occupation,
        city=request.city,
        password=None,  # Google users have no password; email users carry a hash
        avatar_url=user_info.get("avatar_url")
    )

    new_user = user_crud.create_user(db, user_data)

    # Email-registration tokens carry the already-bcrypt'd hash - store it
    # directly (running it through create_user's hashing would double-hash).
    if user_info.get("password_hash"):
        new_user.hashed_password = user_info["password_hash"]
        db.commit()

    access_token, refresh_token = auth_utils.generate_tokens(new_user)
    return {"access_token": access_token, "refresh_token": refresh_token}

# Used for refreshing expired tokens
@router.post("/refresh-token")
async def refresh_token_endpoint(request: user_schema.RefreshTokenRequest, db: Session = Depends(get_db)):
    decoded_token = auth_utils.validate_refresh_token(request.refresh_token)
    if not decoded_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid refresh token")

    # Fetch user from the database using user ID in the token
    user_id = int(decoded_token.get("sub"))
    user = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Issue a new access token
    new_access_token, _ = auth_utils.generate_tokens(user)
    return {"access_token": new_access_token}


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

# Delete a user
@router.delete("/users/{user_id}", response_model=user_schema.User)
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db)):
    deleted_user = user_crud.delete_user(db, user_id)
    if deleted_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return deleted_user

# Get the current user's data
@router.get("/users/me", response_model=user_schema.UserWithSkills)
async def read_current_user_data(db: Session = Depends(get_db), current_user: user_model.User = Depends(auth_utils.get_current_user)):
    user_data = db.query(user_model.User).filter(user_model.User.id == current_user.id).first()
    if not user_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    skills = skill_crud.get_user_skills(db, current_user.id)
    skills_dicts = [convert_to_dict(skill) for skill in skills]
    user_dict = convert_to_dict(user_data)    
    print("skills")
    print("-----------")
    print(skills_dicts)
    print("-----------")
    print("user_dict")
    print("-----------")
    print(user_dict)

    return user_schema.UserWithSkills(**user_dict, skills=skills_dicts)

@router.put("/users/me/timezone")
async def update_user_timezone(
    timezone: str = Body(..., embed=True),
    db: Session = Depends(get_db), 
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Update the current user's timezone
    """
    try:
        import pytz
        pytz.timezone(timezone)  # This will raise an exception if timezone is invalid
        
        current_user.timezone = timezone
        db.commit()
        db.refresh(current_user)
        
        return {"message": "Timezone updated successfully", "timezone": timezone}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {str(e)}"
        )

@router.put("/users/me/avatar")
async def update_user_avatar(
    payload: user_schema.AvatarUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """Set the avatar: a preset (inline SVG data URI) or an https image URL."""
    url = payload.avatar_url.strip()
    if len(url) > 4000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar URL is too long")
    if not (url.startswith("https://") or url.startswith("data:image/svg+xml")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Avatar must be an https image URL or a preset")
    current_user.avatar_url = url
    db.commit()
    return {"avatar_url": url}


@router.get("/users/{user_id}/stats", response_model=Dict)
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    user = user_crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user_crud.get_user_stats(db, user_id)

def convert_to_dict(obj):
    return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}
