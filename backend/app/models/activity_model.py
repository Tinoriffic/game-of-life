from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, Boolean, Date
from sqlalchemy.orm import relationship

from ..database import Base
from datetime import datetime

class UserActivities(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String, index=True)
    description = Column(String)
    xp_earned = Column(Integer)
    date = Column(DateTime, default=datetime.utcnow)
    duration = Column(Integer, default=0)
    volume = Column(Integer, default=0) # for workouts (weight * reps)
    distance = Column(Float, default=0.0)
    counts_towards_streak = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="activities")

class ActivityStreak(Base):
    __tablename__ = "activity_streaks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String, index=True)
    current_streak = Column(Integer, default=0)
    last_activity_date = Column(Date)

    user = relationship("User", back_populates="activity_streaks")

class WeightTracking(Base):
    __tablename__ = "weight_tracking"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    weight = Column(Float)
    date = Column(DateTime, default=datetime.utcnow)
    weight_goal = Column(Float)
    is_starting_weight = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="weight_entries")
    