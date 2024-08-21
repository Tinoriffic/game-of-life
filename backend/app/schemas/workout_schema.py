from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class Exercise(BaseModel):
    exercise_id: int
    name: str

class ExerciseCreate(BaseModel):
    name: str
    sets: Optional[int] = None
    recommended_reps: Optional[int] = None
    recommended_weight: Optional[int] = None
    is_calisthenics: bool = False

class WorkoutDay(BaseModel):
    day_id: int
    program_id: int
    day_name: str

    class ConfigDict:
        from_attributes = True

class WorkoutDayCreate(BaseModel):
    day_name: str
    exercises: List[ExerciseCreate]

class WorkoutProgramExercise(BaseModel):
    program_exercise_id: int
    day_id: int
    exercise_id: int
    sets: Optional[int] = None
    recommended_reps: Optional[int] = None
    recommended_weight: Optional[int] = None
    is_calisthenics: bool = False

class WorkoutProgramExerciseResponse(BaseModel):
    program_exercise_id: int
    exercise_name: str

class WorkoutProgram(BaseModel):
    program_id: int
    user_id: int
    name: str
    days: List[WorkoutDay]

    class ConfigDict:
        from_attributes = True

class WorkoutProgramWithExercises(BaseModel):
    program_id: int
    user_id: int
    name: str
    status: Optional[str] = 'active'
    archived_at: Optional[datetime] = None
    days: List[Dict[str, Any]]

class WorkoutProgramsResponse(BaseModel):
    programs: List[WorkoutProgramWithExercises]
    has_archived: bool

class WorkoutProgramCreate(BaseModel):
    name: str
    workout_days: List[WorkoutDayCreate]

class WorkoutSet(BaseModel):
    set_number: Optional[int] = None
    performed_reps: int
    performed_weight: Optional[int] = None

class WorkoutSessionExercise(BaseModel):
    program_exercise_id: int
    performed_reps: int
    performed_weight: int

class WorkoutSession(BaseModel):
    session_id: int
    program_id: int
    user_id: int
    session_date: datetime
    exercises: List[WorkoutSessionExercise]

class WorkoutSessionExerciseCreate(BaseModel):
    program_exercise_id: int
    sets: List[WorkoutSet]

class WorkoutSessionCreate(BaseModel):
    program_id: int
    date: datetime
    exercises: List[WorkoutSessionExerciseCreate]
