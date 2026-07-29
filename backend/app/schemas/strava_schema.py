from pydantic import BaseModel
from typing import Optional


class StravaSettingsUpdate(BaseModel):
    target_habit_id: Optional[int] = None
    import_rides: Optional[bool] = None
