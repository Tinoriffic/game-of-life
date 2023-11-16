from pydantic import BaseModel
from datetime import datetime

class Skill(BaseModel):
    name: str
    level: int
    xp: int
    daily_xp_earned: int
    last_updated: datetime
