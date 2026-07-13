from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from .skill_schema import Skill
from ..models.user_model import UserRole

class UserCreate(BaseModel):
    username: str
    password: Optional[str] = None
    email: EmailStr
    first_name: str
    last_name: str
    city: str
    occupation: str
    avatar_url: Optional[str] = None

class EmailStartRequest(BaseModel):
    """First step of email/password registration - mirrors the Google callback:
    validates identity, then hands off to the same staged setup flow."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: Optional[str] = Field(default=None, max_length=60)

class EmailLoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=254)  # email or username
    password: str = Field(min_length=1, max_length=128)

class SetUsernameRequest(BaseModel):
    username: str
    token: str

class CreateAccountRequest(BaseModel):
    occupation: str
    city: str
    temp_token: str

class User(BaseModel):
    id: int
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    city: str
    occupation: str
    avatar_url: Optional[str] = None
    role: UserRole = UserRole.USER
    feature_flags: dict = {}

    class ConfigDict:
        from_attributes = True

class UserWithSkills(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    city: str
    occupation: str
    skills: List[Skill]
    avatar_url: Optional[str] = None
    role: UserRole = UserRole.USER
    feature_flags: dict = {}

    class ConfigDict:
        from_attributes = True

# Schema for internal use, including hashed password
class UserInDB(User):
    hashed_password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class AvatarUpdate(BaseModel):
    avatar_url: str
