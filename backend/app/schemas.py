from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List

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

class Skill(BaseModel):
    name: str
    level: int
    xp: int
    daily_xp_earned: int
    last_updated: datetime

class ActivityLog(BaseModel):
    activity_type: str
    description: Optional[str] = None
    xp_earned: int = 0
    duration: int = 0
    volume: int = 0
    distance: float = 0.0
    counts_towards_streak: bool = False
    date: datetime = None

class ActivityStreak(BaseModel):
    user_id: int
    activity_type: str
    current_streak: int
    last_activity_date: date

class WeightEntry(BaseModel):
    weight: float
    date: date
    weight_goal: Optional[float] = None

class Exercise(BaseModel):
    exercise_id: int
    name: str

class ExerciseCreate(BaseModel):
    name: str
    sets: int = 3
    recommended_reps: Optional[int] = 3
    recommended_weight: Optional[int] = 3

class WorkoutDay(BaseModel):
    day_id: int
    program_id: int
    day_name: str

    class Config:
        from_attributes = True

class WorkoutDayCreate(BaseModel):
    day_name: str
    exercises: List[ExerciseCreate]

class WorkoutProgramExercise(BaseModel):
    program_exercise_id: int
    day_id: int
    exercise_id: int
    sets: int
    recommended_reps: Optional[int] = 3
    recommended_weight: Optional[int] = 3

class WorkoutProgram(BaseModel):
    program_id: int
    user_id: int
    name: str
    days: List[WorkoutDay]

    class Config:
        from_attributes = True

class WorkoutProgramCreate(BaseModel):
    name: str
    workout_days: List[WorkoutDayCreate]

class WorkoutSessionExercise(BaseModel):
    session_exercise_id: int
    session_id: int
    program_exercise_id: int
    performed_reps: int
    performed_weight: int

class WorkoutSession(BaseModel):
    session_id: int
    program_id: int
    user_id: int
    session_date: date
    exercises: List[WorkoutSessionExercise]
