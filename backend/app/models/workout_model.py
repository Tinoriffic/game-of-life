from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Enum, Float, Text, Boolean
from sqlalchemy.orm import relationship

from ..database import Base
from ..utils.time import utc_now

class WorkoutProgram(Base):
    __tablename__ = "workout_programs"
    program_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    name = Column(String, nullable=False)
    status = Column(Enum('active', 'archived', name='program_status'), nullable=False, default='active')
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)
    archived_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates='workout_programs')
    workout_days = relationship('WorkoutDay', back_populates='workout_program')
    workout_sessions = relationship('WorkoutSession', back_populates='workout_program', lazy='selectin')

class WorkoutDay(Base):
    __tablename__ = "workout_days"
    day_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey('workout_programs.program_id'))
    day_name = Column(String, nullable=False)

    workout_program = relationship('WorkoutProgram', back_populates='workout_days')
    exercises = relationship('ProgramExercise', back_populates='workout_day', lazy='selectin')

class ProgramExercise(Base):
    __tablename__ = "program_exercises"
    program_exercise_id = Column(Integer, primary_key=True, index=True)
    day_id = Column(Integer, ForeignKey('workout_days.day_id'))
    exercise_id = Column(Integer, ForeignKey('exercises.exercise_id'))
    sets = Column(Integer, nullable=False)
    recommended_reps = Column(Integer, default=3)
    recommended_weight = Column(Float, default=0)

    workout_day = relationship('WorkoutDay', back_populates='exercises')
    exercise = relationship('Exercise')

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    session_id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey('workout_programs.program_id'))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    session_date = Column(DateTime, default=utc_now)

    # Audit fields for historical logging
    logged_by_admin = Column(Boolean, default=False)
    admin_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship('User', foreign_keys=[user_id])
    admin_user = relationship('User', foreign_keys=[admin_user_id])
    workout_program = relationship('WorkoutProgram', back_populates='workout_sessions')
    exercises = relationship('SessionExercise', back_populates='session')

class SessionExercise(Base):
    __tablename__ = 'session_exercises'
    session_exercise_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('workout_sessions.session_id'))
    exercise_id = Column(Integer, ForeignKey('exercises.exercise_id'))
    total_volume = Column(Float)
    total_intensity_score = Column(Float)

    session = relationship("WorkoutSession", back_populates="exercises")
    exercise = relationship("Exercise")
    sets = relationship("WorkoutSet", back_populates="session_exercise")

class WorkoutSet(Base):
    __tablename__ = 'workout_sets'
    set_id = Column(Integer, primary_key=True, index=True)
    session_exercise_id = Column(Integer, ForeignKey('session_exercises.session_exercise_id'))
    set_number = Column(Integer)
    performed_weight = Column(Float)
    performed_reps = Column(Integer)

    session_exercise = relationship("SessionExercise", back_populates="sets")

# Models below will be used for a global library of exercises in which users can choose from and add to
class ExerciseCategory(Base):
    __tablename__ = 'exercise_categories'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    exercises = relationship('Exercise', back_populates='category')


class ExerciseMuscleGroup(Base):
    __tablename__ = 'exercise_muscle_groups'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    exercises = relationship('Exercise', back_populates='muscle_group')


class ExerciseEquipment(Base):
    __tablename__ = 'exercise_equipment'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    exercises = relationship('Exercise', back_populates='equipment')


class ExerciseDifficultyLevel(Base):
    __tablename__ = 'exercise_difficulty_levels'
    id = Column(Integer, primary_key=True)
    level = Column(String, unique=True, nullable=False)

    exercises = relationship('Exercise', back_populates='difficulty_level')


class ExerciseType(Base):
    __tablename__ = 'exercise_types'
    id = Column(Integer, primary_key=True)
    type = Column(String, unique=True, nullable=False)

    exercises = relationship('Exercise', back_populates='exercise_type')

class Exercise(Base):
    __tablename__ = "exercises"
    exercise_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    media_url = Column(String, nullable=True)
    primary_muscles = Column(String, nullable=True)
    secondary_muscles = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Foreign keys to new tables with updated names
    category_id = Column(Integer, ForeignKey('exercise_categories.id'), nullable=False)
    muscle_group_id = Column(Integer, ForeignKey('exercise_muscle_groups.id'), nullable=False)
    equipment_id = Column(Integer, ForeignKey('exercise_equipment.id'), nullable=False)
    difficulty_level_id = Column(Integer, ForeignKey('exercise_difficulty_levels.id'), nullable=False)
    exercise_type_id = Column(Integer, ForeignKey('exercise_types.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    is_global = Column(Boolean, default=True)


    # Relationships to new tables with updated names
    category = relationship('ExerciseCategory', back_populates='exercises')
    muscle_group = relationship('ExerciseMuscleGroup', back_populates='exercises')
    equipment = relationship('ExerciseEquipment', back_populates='exercises')
    difficulty_level = relationship('ExerciseDifficultyLevel', back_populates='exercises')
    exercise_type = relationship('ExerciseType', back_populates='exercises')

    # Relationships to other models
    program_exercises = relationship('ProgramExercise', back_populates='exercise')
    session_exercises = relationship('SessionExercise', back_populates='exercise')
    user = relationship('User', back_populates='created_exercises')
