from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List

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

class WeightLog(BaseModel):
    id: int
    user_id: int
    weight: float
    date: datetime
    weight_goal: Optional[float] = None
    is_starting_weight: bool

    class ConfigDict:
        from_attributes = True

class WeightLogsResponse(BaseModel):
    logs: List[WeightLog]
    latestWeightGoal: Optional[float] = None