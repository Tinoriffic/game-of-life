from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

# Schema for internal use, including hashed password
class UserInDB(User):
    hashed_password: str

class ActivityLog(BaseModel):
    activity_type: str
    description: str
    xp_earned: int
    duration: int = 0
    volume: int = 0
    distance: float = 0.0