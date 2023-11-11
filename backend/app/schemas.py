from pydantic import BaseModel
import datetime

class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    first_name: str
    last_name: str
    city: str
    occupation: str

class User(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    city: str
    occupation: str

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
    counts_towards_streak: bool = False
    date: datetime.datetime = None

class ActivityStreak(BaseModel):
    user_id: int
    activity_type: str
    current_streak: int
    last_activity_date: datetime.date

class WeightEntry(BaseModel):
    weight: float
    date: datetime.date
    weight_goal: float = None

class Skill(BaseModel):
    name: str
    level: int
    xp: int
    daily_xp_earned: int
