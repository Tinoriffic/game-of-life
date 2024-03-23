from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from ..database import Base

class WorkoutProgram(Base):
    __tablename__ = "workout_programs"
    program_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    name = Column(String, nullable=False)  # Name of the program i.e., 'PPL, 7-Day Split'
    
    user = relationship("User", back_populates='workout_programs')
    workout_days = relationship('WorkoutDay', back_populates='workout_program')
    workout_sessions = relationship('WorkoutSession', back_populates='workout_program')

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

# Specific exercises within each work out day for a program
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


# Instances of when a user performs a workout
class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey('workout_programs.program_id'))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    session_date = Column(DateTime, default=datetime.now)

    workout_program = relationship('WorkoutProgram', back_populates='workout_sessions')
    exercises = relationship('WorkoutSessionExercise', back_populates='session')

# Specific exercises performed during a workout session
class WorkoutSessionExercise(Base):
    __tablename__ = 'workout_session_exercises'
    session_exercise_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('workout_sessions.session_id'))
    program_exercise_id = Column(Integer, ForeignKey('workout_program_exercises.program_exercise_id'))
    set_number = Column(Integer, nullable=False)
    performed_reps = Column(Integer)
    performed_weight = Column(Integer)

    session = relationship('WorkoutSession', back_populates='exercises')
    program_exercise = relationship('WorkoutProgramExercise', back_populates='session_exercises')
