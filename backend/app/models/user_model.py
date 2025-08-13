from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from ..database import Base

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
    
    skills = relationship("Skill", back_populates="user")
    activities = relationship("UserActivities", back_populates="user")
    skill_progression = relationship("SkillProgression", back_populates="user")
    workout_programs = relationship("WorkoutProgram", back_populates="user")
    activity_streaks = relationship("ActivityStreak", back_populates="user")
    weight_entries = relationship("WeightTracking", back_populates="user")
    created_exercises = relationship("Exercise", back_populates="user")
    user_challenges = relationship("UserChallenge", back_populates="user")
    user_badges = relationship("UserBadge", back_populates="user")
