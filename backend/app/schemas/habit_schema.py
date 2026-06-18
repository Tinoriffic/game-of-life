from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
# Alias the type: fields named `date` would shadow it during Pydantic's
# annotation resolution (the field type silently collapses to None).
from datetime import date as DateType, datetime


# --- Buckets & library ------------------------------------------------------

class HabitTemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    default_cadence_type: str
    default_times_per_week: Optional[int] = None
    default_weekdays: Optional[List[int]] = None
    measurement_kind: Optional[str] = None
    measurement_unit: Optional[str] = None


class BucketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    key: str
    name: str
    description: Optional[str] = None
    attribute: Optional[str] = None
    detail_kind: str
    base_xp: int
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: int
    templates: List[HabitTemplateOut] = []


# --- Habits ------------------------------------------------------------------

class HabitCreate(BaseModel):
    bucket_id: int
    name: str = Field(min_length=1, max_length=80)
    icon: Optional[str] = None
    cadence_type: str = "daily"                       # 'daily' | 'weekly' | 'weekdays'
    times_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    weekdays: Optional[List[int]] = None              # 0=Mon .. 6=Sun
    habit_type: str = "standard"                      # 'standard' | 'measurement'
    measurement_kind: Optional[str] = None
    measurement_unit: Optional[str] = None
    template_id: Optional[int] = None                 # created from the library
    program_id: Optional[int] = None                  # links a Strength habit to a workout program
    target_value: Optional[float] = None              # measurement goal (e.g. goal weight)


class HabitReorder(BaseModel):
    ordered_ids: List[int]


class HabitUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    icon: Optional[str] = None
    cadence_type: Optional[str] = None
    times_per_week: Optional[int] = Field(default=None, ge=1, le=7)
    weekdays: Optional[List[int]] = None
    target_value: Optional[float] = None              # edit the measurement goal
    program_id: Optional[int] = None                  # link/unlink a program


class HabitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bucket_id: int
    name: str
    icon: Optional[str] = None
    habit_type: str
    measurement_kind: Optional[str] = None
    measurement_unit: Optional[str] = None
    cadence_type: str
    times_per_week: Optional[int] = None
    weekdays: Optional[List[int]] = None
    status: str
    created_at: Optional[datetime] = None
    program_id: Optional[int] = None
    target_value: Optional[float] = None


# --- Logging ------------------------------------------------------------------

class HabitLogCreate(BaseModel):
    date: Optional[DateType] = None      # default: today (user tz); backfill within 48h window
    value: Optional[float] = None        # measurement habits
    duration_minutes: Optional[float] = Field(default=None, ge=0, le=24 * 60)
    distance: Optional[float] = Field(default=None, ge=0)
    quantity: Optional[int] = Field(default=None, ge=0)
    note: Optional[str] = Field(default=None, max_length=500)


class HabitLogUpdate(BaseModel):
    value: Optional[float] = None
    duration_minutes: Optional[float] = Field(default=None, ge=0, le=24 * 60)
    distance: Optional[float] = Field(default=None, ge=0)
    quantity: Optional[int] = Field(default=None, ge=0)
    note: Optional[str] = Field(default=None, max_length=500)


class HabitLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    habit_id: int
    date: DateType
    value: Optional[float] = None
    duration_minutes: Optional[float] = None
    distance: Optional[float] = None
    quantity: Optional[int] = None
    note: Optional[str] = None
    attribute: Optional[str] = None
    attribute_xp: int
    player_xp: int
    is_backfill: bool
