from sqlalchemy import Column, Integer, String, Enum, Float, JSON
from sqlalchemy.orm import relationship
import enum

from ..database import Base

class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"
    MODERATOR = "moderator"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    email = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    city = Column(String)
    occupation = Column(String)
    avatar_url = Column(String, nullable=True)
    timezone = Column(String, default='UTC', nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    # Player XP (overall level) is a separate track from attribute XP:
    # earned through day-completes, measurements, milestones, challenges.
    player_xp = Column(Integer, default=0, nullable=False)
    # Per-user feature gates ({"click_tracking": true}); generic so a future
    # paywall/tier decision needs no schema rework.
    feature_flags = Column(JSON, nullable=False, default=dict, server_default='{}')
    # Click tracking settings (only meaningful when the flag is on).
    click_daily_target = Column(Float, nullable=False, default=2.0, server_default='2.0')
    focus_ritual = Column(JSON, nullable=True)  # list[str]; null = default checklist

    skills = relationship("Skill", back_populates="user")
    habits = relationship("Habit", back_populates="user")
    activities = relationship("UserActivities", foreign_keys="[UserActivities.user_id]", back_populates="user")
    skill_progression = relationship("SkillProgression", back_populates="user")
    workout_programs = relationship("WorkoutProgram", back_populates="user")
    activity_streaks = relationship("ActivityStreak", back_populates="user")
    weight_entries = relationship("WeightTracking", foreign_keys="[WeightTracking.user_id]", back_populates="user")
    created_exercises = relationship("Exercise", back_populates="user")
    user_challenges = relationship("UserChallenge", back_populates="user")
    user_badges = relationship("UserBadge", back_populates="user")
