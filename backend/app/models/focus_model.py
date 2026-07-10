from sqlalchemy import (
    Column, ForeignKey, Integer, String, Float, DateTime, Date, JSON, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from ..database import Base
from ..utils.time import utc_now


class FocusCategory(Base):
    """
    A user-defined bucket of needle-moving work ("DS&A", "Job Search"...).
    May link to one habit (the click<->habit bridge); works standalone too -
    not everything click-worthy is habit-shaped or worth a habit slot.
    """
    __tablename__ = "focus_categories"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    # Unique: a habit maps to at most one category, so habit-log durations
    # attribute unambiguously. Survives habit archival (SET NULL = deletion only).
    linked_habit_id = Column(
        Integer, ForeignKey("habits.id", ondelete="SET NULL"), nullable=True, unique=True)
    sort_order = Column(Integer, default=0)
    status = Column(String, nullable=False, default="active")  # 'active' | 'archived'
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User")
    linked_habit = relationship("Habit")
    sessions = relationship("FocusSession", back_populates="category")


class FocusSession(Base):
    """
    One block of focused time. A live timer is a row with null ended_at -
    that's what makes it survive refresh/crash/device switches. Completed
    time (duration_minutes set) is the only thing clicks ever count.
    """
    __tablename__ = "focus_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("focus_categories.id", ondelete="CASCADE"), nullable=False)
    # Local calendar date the session belongs to (the date it STARTED, even
    # if it crosses midnight) - same convention as habit_logs.date.
    date = Column(Date, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)   # null for manual entries
    ended_at = Column(DateTime, nullable=True)     # null while a timer is live
    # Interruptions: accumulated pause time is excluded from elapsed/duration.
    # A live pause is an open interval (pause_started_at set), so it survives
    # refresh exactly like the timer itself.
    paused_seconds = Column(Float, nullable=False, default=0, server_default='0')
    pause_started_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Float, nullable=True)  # authoritative once set
    source = Column(String, nullable=False, default="timer")  # 'timer' | 'manual'
    note = Column(String, nullable=True)
    captures = Column(JSON, nullable=True)         # capture-pad strings
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User")
    category = relationship("FocusCategory", back_populates="sessions")


class FocusDayNote(Base):
    """
    Day-level context ("wrist injury") - matters most on zero-click days,
    which have no session row to hang a note on.
    """
    __tablename__ = "focus_day_notes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_focus_day_note_per_day"),
    )
