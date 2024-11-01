from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

# Create schemas
class ExerciseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    primary_muscles: Optional[str] = None
    secondary_muscles: Optional[str] = None
    category_id: int
    muscle_group_id: int
    equipment_id: int
    difficulty_level_id: int
    exercise_type_id: int
    is_global: bool = False

class ProgramExerciseCreate(BaseModel):
    exercise_id: int
    sets: int
    recommended_reps: Optional[int] = None
    recommended_weight: Optional[float] = None

class WorkoutDay(BaseModel):
    day_id: int
    program_id: int
    day_name: str

class WorkoutDayCreate(BaseModel):
    day_name: str
    exercises: List[ProgramExerciseCreate]

class WorkoutProgramCreate(BaseModel):
    name: str
    workout_days: List[WorkoutDayCreate]

class WorkoutSetCreate(BaseModel):
    set_number: int
    weight: Optional[float] = None
    reps: int

class SessionExerciseCreate(BaseModel):
    exercise_id: int
    sets: List[WorkoutSetCreate]

class WorkoutSessionCreate(BaseModel):
    program_id: int
    session_date: datetime
    exercises: List[SessionExerciseCreate]

# Read schemas
class Exercise(BaseModel):
    exercise_id: int
    name: str
    description: Optional[str]
    instructions: Optional[str]
    primary_muscles: Optional[str]
    secondary_muscles: Optional[str]
    category_id: int
    muscle_group_id: int
    equipment_id: int
    difficulty_level_id: int
    exercise_type_id: int
    is_global: bool
    user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExerciseSet(BaseModel):
    set_number: int
    weight: Optional[float] = None
    reps: int

    class Config:
        from_attributes = True

class ProgramExercise(BaseModel):
    program_exercise_id: int
    exercise_id: int
    sets: int
    recommended_reps: Optional[int]
    recommended_weight: Optional[float]

    class Config:
        from_attributes = True

class WorkoutDay(BaseModel):
    day_id: int
    program_id: int
    day_name: str
    exercises: List[ProgramExercise]

    class Config:
        from_attributes = True

class WorkoutProgram(BaseModel):
    program_id: int
    user_id: int
    name: str
    status: str
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
    workout_days: List[WorkoutDay]

    class Config:
        from_attributes = True

class SessionExercise(BaseModel):
    exercise_id: int
    name: str
    total_volume: float
    total_intensity_score: float
    sets: List[ExerciseSet]

    class Config:
        from_attributes = True

class WorkoutSession(BaseModel):
    session_id: int
    user_id: int
    program_id: int
    program_name: str
    session_date: datetime
    exercises: List[SessionExercise]

    class Config:
        from_attributes = True

# Update schemas
class ExerciseUpdate(BaseModel):
    name: Optional[str]
    description: Optional[str]
    instructions: Optional[str]
    primary_muscles: Optional[str]
    secondary_muscles: Optional[str]
    category_id: Optional[int]
    muscle_group_id: Optional[int]
    equipment_id: Optional[int]
    difficulty_level_id: Optional[int]
    exercise_type_id: Optional[int]

class WorkoutProgramUpdate(BaseModel):
    name: Optional[str]
    status: Optional[str]
    workout_days: Optional[List[WorkoutDayCreate]]

# List schemas
class ExerciseList(BaseModel):
    exercises: List[Exercise]

class WorkoutProgramList(BaseModel):
    programs: List[WorkoutProgram]

class WorkoutSessionList(BaseModel):
    sessions: List[WorkoutSession]

# Response schemas
class WorkoutProgramsResponse(BaseModel):
    programs: List[WorkoutProgram]
    has_archived: bool
    
    class Config:
        from_attributes = True

class WorkoutProgressResponse(BaseModel):
    sessions: List[WorkoutSession]

    class Config:
        from_attributes = True