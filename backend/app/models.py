from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, Date, Boolean
from sqlalchemy.orm import relationship

from .database import Base
from datetime import datetime

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
    
    skills = relationship("Skill", back_populates="user")
    activities = relationship("UserActivities", back_populates="user")
    skill_progression = relationship("SkillProgression", back_populates="user")
    workout_programs = relationship("WorkoutProgram", back_populates="user")
    activity_streaks = relationship("ActivityStreak", back_populates="user")
    weight_entries = relationship("WeightTracking", back_populates="user")


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

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    daily_xp_earned = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_skill_id = Column(Integer, ForeignKey("skills.id"))
    
    user = relationship("User", back_populates="skills")

class SkillProgression(Base):
    __tablename__ = "skill_progression"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_name = Column(String, index=True)
    xp = Column(Integer)
    level = Column(Integer)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
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
    date = Column(DateTime, default=datetime.utcnow)
    weight_goal = Column(Float)
    is_starting_weight = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="weight_entries")

class WorkoutProgram(Base):
    __tablename__ = "workout_programs"
    program_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)  # Name of the program i.e., 'PPL, 7-Day Split'
    
    user = relationship("User", back_populates="workout_programs")
    workout_days = relationship('WorkoutDay', back_populates='workout_program')
    workout_sessions = relationship("WorkoutSession", back_populates="workout_program")

class WorkoutDay(Base):
    __tablename__ = "workout_days"
    day_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey('workout_programs.program_id'))
    day_name = Column(String, nullable=False)

    workout_program = relationship('WorkoutProgram', back_populates='workout_days')
    exercises = relationship('WorkoutProgramExercise', back_populates='workout_day')

class Exercise(Base):
    __tablename__ = "exercises"
    exercise_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    program_exercises = relationship('WorkoutProgramExercise', back_populates='exercise')
    session_exercises = relationship('WorkoutSessionExercise', back_populates='exercise')

class WorkoutProgramExercise(Base):
    __tablename__ = "workout_program_exercises"
    program_exercise_id = Column(Integer, primary_key=True, index=True)
    day_id = Column(Integer, ForeignKey('workout_days.day_id'))
    exercise_id = Column(Integer, ForeignKey('exercises.exercise_id'))
    sets = Column(Integer, nullable=False)
    recommended_reps = Column(Integer, default=3)
    recommended_weight = Column(Integer, default=3)

    workout_day = relationship('WorkoutDay', back_populates='exercises')
    exercise = relationship('Exercise', back_populates='program_exercises')
    session_exercises = relationship('WorkoutSessionExercise', back_populates='program_exercise')


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey('workout_programs.program_id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    session_date = Column(Date, nullable=False)

    workout_program = relationship('WorkoutProgram', back_populates='workout_sessions')
    exercises = relationship('WorkoutSessionExercise', back_populates='session')

class WorkoutSessionExercise(Base):
    __tablename__ = 'workout_session_exercises'
    session_exercise_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('workout_sessions.session_id'))
    program_exercise_id = Column(Integer, ForeignKey('workout_program_exercises.program_exercise_id'))
    exercise_id = Column(Integer, ForeignKey('exercises.exercise_id'))
    performed_reps = Column(Integer)
    performed_weight = Column(Integer)

    session = relationship('WorkoutSession', back_populates='exercises')
    program_exercise = relationship('WorkoutProgramExercise', back_populates='session_exercises')
    exercise = relationship('Exercise', back_populates='session_exercises')

