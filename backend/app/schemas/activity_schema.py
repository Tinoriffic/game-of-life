from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

class ActivityLog(BaseModel):
    activity_type: str
    description: Optional[str] = None
    notes: Optional[str] = None
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
