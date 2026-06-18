from sqlalchemy import (
    Column, ForeignKey, Integer, String, Float, DateTime, Boolean, Date, JSON,
    Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

from ..database import Base
from ..utils.time import utc_now


class Bucket(Base):
    """
    An app-owned category of self-improvement action. Buckets carry the
    attribute mapping, the XP rules, and the optional detail schema.
    Buckets are app-data (seeded), not code: tuning them never requires
    new backend logic.
    """
    __tablename__ = "buckets"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # Which of the 8 attributes habit logs in this bucket feed.
    # Null for the measurement bucket (measurement habits pay flat player XP only).
    attribute = Column(String, nullable=True)
    # 'none' | 'duration' | 'distance_duration' | 'volume' | 'quantity' | 'pages' | 'note'
    detail_kind = Column(String, nullable=False, default="none")
    base_xp = Column(Integer, nullable=False, default=10)
    icon = Column(String, nullable=True)
    color = Column(String, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    # Legacy challenge activity_type values this bucket satisfies (e.g. ["cardio"]).
    # Lets habit logs auto-progress matching habit-contract challenges.
    challenge_tags = Column(JSON, nullable=True)

    templates = relationship("HabitTemplate", back_populates="bucket")
    habits = relationship("Habit", back_populates="bucket")


class HabitTemplate(Base):
    """
    Curated example habits the library ships with, per bucket. Creating a
    habit = pick from the library or name your own within a bucket.
    """
    __tablename__ = "habit_templates"
    id = Column(Integer, primary_key=True, index=True)
    bucket_id = Column(Integer, ForeignKey("buckets.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    default_cadence_type = Column(String, nullable=False, default="daily")  # 'daily' | 'weekly' | 'weekdays'
    default_times_per_week = Column(Integer, nullable=True)
    default_weekdays = Column(JSON, nullable=True)  # [0..6], 0 = Monday
    measurement_kind = Column(String, nullable=True)  # e.g. 'weight'
    measurement_unit = Column(String, nullable=True)  # e.g. 'lbs'
    sort_order = Column(Integer, default=0)

    bucket = relationship("Bucket", back_populates="templates")


class Habit(Base):
    """
    A user-named instance of a bucket with a cadence. The user owns the habit;
    the bucket owns the meaning (attribute + XP rules).
    """
    __tablename__ = "habits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bucket_id = Column(Integer, ForeignKey("buckets.id"), nullable=False)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    # 'standard' (checkmark, optional detail) | 'measurement' (the log IS a data point)
    habit_type = Column(String, nullable=False, default="standard")
    measurement_kind = Column(String, nullable=True)   # 'weight' wires into weight trend/goal charts
    measurement_unit = Column(String, nullable=True)
    # 'daily' | 'weekly' (N x per week) | 'weekdays' (specific days)
    cadence_type = Column(String, nullable=False, default="daily")
    times_per_week = Column(Integer, nullable=True)
    weekdays = Column(JSON, nullable=True)  # [0..6], 0 = Monday
    status = Column(String, nullable=False, default="active")  # 'active' | 'archived'
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    archived_at = Column(DateTime, nullable=True)
    # A Strength habit backed by a workout program opens the full-screen per-set
    # logger (defaulting to the next day in rotation). Null = generic check-off habit.
    program_id = Column(Integer, ForeignKey("workout_programs.program_id", ondelete="SET NULL"), nullable=True)
    # Measurement goal (e.g. goal weight on the Weigh-in habit). Drives the goal line.
    target_value = Column(Float, nullable=True)

    user = relationship("User", back_populates="habits")
    bucket = relationship("Bucket", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")
    program = relationship("WorkoutProgram")


class HabitLog(Base):
    """
    One completion of a habit on a calendar day (user's timezone).
    XP pays once per habit per day; editing detail adds data, not XP.
    """
    __tablename__ = "habit_logs"
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)

    # Optional detail (earns bonus XP and feeds analytics)
    value = Column(Float, nullable=True)             # measurement habits: the data point
    duration_minutes = Column(Float, nullable=True)  # may be fractional (cardio logs minutes + seconds)
    distance = Column(Float, nullable=True)          # miles
    quantity = Column(Integer, nullable=True)        # problems, pages, reps...
    note = Column(String, nullable=True)

    # Payout snapshot (so undo can reverse exactly what was paid)
    attribute = Column(String, nullable=True)
    attribute_xp = Column(Integer, nullable=False, default=0)
    player_xp = Column(Integer, nullable=False, default=0)

    is_backfill = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    habit = relationship("Habit", back_populates="logs")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("habit_id", "date", name="uq_habit_log_per_day"),
    )


class DayCompletion(Base):
    """
    Day-complete state for a user + date. All scheduled habits done = complete;
    most-but-not-all = partial (lesser acknowledgment). player_xp records what
    was paid for this date so upgrades/undo apply deltas, never double-pay.
    """
    __tablename__ = "day_completions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    scheduled_count = Column(Integer, nullable=False, default=0)
    completed_count = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="none")  # 'none' | 'partial' | 'complete'
    player_xp = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_day_completion_per_day"),
    )


class PlayerXPEvent(Base):
    """
    Ledger of player-XP payouts (the separate track from attribute XP).
    source_key makes pay-once sources (streak milestones) idempotent.
    """
    __tablename__ = "player_xp_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)
    # 'day_complete' | 'partial_day' | 'measurement' | 'streak_milestone' | 'challenge' | ...
    source = Column(String, nullable=False)
    source_key = Column(String, nullable=True, index=True)
    meta = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User")
