from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
# Aliased for the same reason as habit_schema: fields named `date` shadow the
# type during Pydantic's annotation resolution.
from datetime import date as DateType, datetime


# --- Categories ---------------------------------------------------------------

class FocusCategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: Optional[str] = None
    icon: Optional[str] = None
    linked_habit_id: Optional[int] = None


class FocusCategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    color: Optional[str] = None
    icon: Optional[str] = None
    # Explicit null unlinks; omitted leaves the link alone (checked via fields_set).
    linked_habit_id: Optional[int] = None
    status: Optional[str] = None  # 'active' | 'archived'
    sort_order: Optional[int] = None


class FocusCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    linked_habit_id: Optional[int] = None
    sort_order: int
    status: str


# --- Sessions -------------------------------------------------------------------

class FocusSessionStart(BaseModel):
    category_id: int


class FocusSessionStop(BaseModel):
    # Optional trim: user-corrected duration, capped server-side at elapsed time.
    duration_minutes: Optional[float] = Field(default=None, gt=0, le=24 * 60)
    note: Optional[str] = Field(default=None, max_length=500)
    captures: Optional[List[str]] = None


class FocusSessionManual(BaseModel):
    category_id: int
    date: Optional[DateType] = None      # default today (user tz); past allowed
    duration_minutes: float = Field(gt=0, le=24 * 60)
    note: Optional[str] = Field(default=None, max_length=500)


class FocusSessionUpdate(BaseModel):
    duration_minutes: Optional[float] = Field(default=None, gt=0, le=24 * 60)
    note: Optional[str] = Field(default=None, max_length=500)


class CaptureAdd(BaseModel):
    text: str = Field(min_length=1, max_length=300)


class FocusSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    date: DateType
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    source: str
    note: Optional[str] = None
    captures: Optional[List[str]] = None


# --- Day notes & settings --------------------------------------------------------

class FocusDayNoteUpsert(BaseModel):
    date: DateType
    note: str = Field(max_length=500)  # empty string clears the note


class FocusSettingsUpdate(BaseModel):
    click_daily_target: Optional[float] = Field(default=None, gt=0, le=24)
    ritual: Optional[List[str]] = None   # full replacement list


# --- Admin -----------------------------------------------------------------------

class FeatureToggle(BaseModel):
    key: str = Field(min_length=1, max_length=60)
    enabled: bool
