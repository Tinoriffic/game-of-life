from sqlalchemy import (
    Column, ForeignKey, Integer, BigInteger, String, Float, DateTime, Boolean,
    UniqueConstraint
)
from sqlalchemy.orm import relationship

from ..database import Base
from ..utils.time import utc_now


class StravaConnection(Base):
    """
    One Strava account linked to one user. Holds the OAuth tokens (refreshed on
    demand) and the import settings: which habit imported runs log to, and
    whether rides count too. Deleting it disconnects Strava; the imported logs
    stay (they're real history).
    """
    __tablename__ = "strava_connections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    athlete_id = Column(BigInteger, nullable=False, unique=True, index=True)

    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    expires_at = Column(Integer, nullable=False)   # epoch seconds (Strava's own format)
    scope = Column(String, nullable=True)

    # The Cardio habit imported activities check off. Null = imports are parked
    # until the user picks a target (the sync endpoint surfaces this).
    target_habit_id = Column(Integer, ForeignKey("habits.id", ondelete="SET NULL"), nullable=True)
    import_rides = Column(Boolean, nullable=False, default=False)   # runs always; rides opt-in

    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="strava_connection")
    target_habit = relationship("Habit")
    imports = relationship("StravaActivityImport", back_populates="connection",
                           cascade="all, delete-orphan")


class StravaActivityImport(Base):
    """
    Dedup ledger: one row per Strava activity we've already imported, so a
    re-sync (or an overlapping webhook + manual sync) never double-counts. Also
    the audit trail linking a Strava activity to the habit log it fed.
    """
    __tablename__ = "strava_activity_imports"
    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("strava_connections.id", ondelete="CASCADE"),
                           nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_id = Column(BigInteger, nullable=False)

    sport_type = Column(String, nullable=True)
    log_date = Column(String, nullable=True)     # the user-tz calendar day it mapped to (ISO)
    distance_miles = Column(Float, nullable=True)
    duration_minutes = Column(Float, nullable=True)
    habit_log_id = Column(Integer, ForeignKey("habit_logs.id", ondelete="SET NULL"), nullable=True)
    imported_at = Column(DateTime, default=utc_now)

    connection = relationship("StravaConnection", back_populates="imports")

    __table_args__ = (
        UniqueConstraint("user_id", "activity_id", name="uq_strava_activity_per_user"),
    )
