from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, Date, Boolean
from sqlalchemy.orm import relationship

from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    skills = relationship("Skill", back_populates="user")
    activities = relationship("UserActivities", back_populates="user")
    skill_progression = relationship("SkillProgression", back_populates="user")
    workout_programs = relationship("WorkoutProgram", back_populates="user")
    activity_streaks = relationship("ActivityStreak", back_populates="user")


class UserActivities(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String, index=True)
    description = Column(String)
    xp_earned = Column(Integer)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    duration = Column(Integer, default=0)
    volume = Column(Integer, default=0) # for workouts (weight * reps)
    distance = Column(Float, default=0.0)
    counts_towards_streak = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="activities")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    daily_xp_earned = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_skill_id = Column(Integer, ForeignKey("skills.id"))
    
    user = relationship("User", back_populates="skills")

    def add_xp(self, xp_amount: int):
        self.daily_xp_earned += xp_amount
        self.xp += xp_amount
        self.check_level_up()

    def check_level_up(self):
        required_xp = calculate_required_xp(self.level)
        if self.xp >= required_xp:
            self.level += 1
            self.xp -= required_xp  # Carry over excess XP to next level

    def calculate_required_xp(level: int, base_xp: int = 100) -> int:
        """
        Calculate the required XP for the next level using the formula:
        XP required for next level = Base XP * (Current Level)^1.5

        :param level: Current level of the skill.
        :param base_xp: Base XP required for leveling up from level 1 to level 2. Default is 100.
        :return: The XP required to reach the next level.
        """
        return int(base_xp * (level ** 1.5))

class SkillProgression(Base):
    __tablename__ = "skill_progression"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_name = Column(String, index=True)
    xp = Column(Integer)
    level = Column(Integer)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="skill_progression")

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
    date = Column(DateTime, default=datetime.datetime.utcnow)
    weight_goal = Column(Float)
    is_starting_weight = Column(Boolean, default=False)
    user = relationship("User", back_populates="weight_entries")

class WorkoutProgram(Base):
    __tablename__ = "workout_programs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)  # Name of the program i.e., 'PPL, 7-Day Split'
    day_of_program = Column(String, index=True)  # 'Day 1', 'Day 2', etc.
    exercises = Column(String)  # JSON or stringified list of exercises and desired sets
    user = relationship("User", back_populates="workout_programs")
    workout_sessions = relationship("WorkoutSession", back_populates="workout_program")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    id = Column(Integer, primary_key=True, index=True)
    workout_program_id = Column(Integer, ForeignKey("workout_programs.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    exercises_completed = Column(String)  # JSON or stringified list of completed exercises, reps, and weight
    workout_program = relationship("WorkoutProgram", back_populates="workout_sessions")

