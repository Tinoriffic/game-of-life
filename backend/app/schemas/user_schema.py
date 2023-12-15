from pydantic import BaseModel, EmailStr
from typing import Optional, List
from .skill_schema import Skill

class UserCreate(BaseModel):
    username: str
    password: Optional[str] = None
    email: EmailStr
    first_name: str
    last_name: str
    city: str
    occupation: str

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

    class ConfigDict:
        from_attributes = True

# Schema for internal use, including hashed password
class UserInDB(User):
    hashed_password: str
