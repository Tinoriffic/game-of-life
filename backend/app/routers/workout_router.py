from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..schemas import workout_schema
from ..models import workout_model
from ..crud import workout_crud, user_crud
from ..dependencies import get_db
from typing import List, Dict, Tuple, Optional
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# Workout Endpoints

# Create a workout program
@router.post("/users/{user_id}/workout-programs", response_model=workout_schema.WorkoutProgram)
def create_workout_program(user_id: int, program: workout_schema.WorkoutProgramCreate, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    try:
        new_program = workout_crud.create_workout_program(user_id=user_id, program=program, db=db)
        return workout_schema.WorkoutProgram.model_validate(new_program)
    except TypeError as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating workout program for user {user_id}: {str(e)}", exc_info=True)
        logger.error(f"Program data: {program.model_dump()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
@router.post("/exercises", response_model=workout_schema.Exercise)
def create_exercise(user_id: int, exercise: workout_schema.ExerciseCreate, db: Session=Depends(get_db)):
    return workout_crud.create_user_exercise(db, user_id, exercise)

@router.put("/exercises/{exercise_id}", response_model=workout_schema.Exercise)
def update_exercise(user_id: int, exercise_id: int, exercise_update: workout_schema.ExerciseUpdate, db: Session = Depends(get_db)):
    updated_exercise = workout_crud.edit_exercise(db, exercise_id, user_id, exercise_update)
    if not updated_exercise:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found!")
    return updated_exercise

@router.get("/exercises", response_model=List[workout_schema.Exercise])
def get_exercises(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    return workout_crud.get_exercises(db, user_id)

@router.delete("/exercises/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(user_id: int, exercise_id: int, db: Session = Depends(get_db)):
    try:
        result = workout_crud.delete_exercise(db, exercise_id, user_id)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found or you don't have permission to delete it!")
        return {"detail": "Exercise deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Fetch exercise metadata values    
@router.get("/exercises/lookup-data")
def get_exercise_lookup_data(db: Session = Depends(get_db)):
    return {
        "categories": [{"id": cat.id, "name": cat.name} for cat in db.query(workout_model.ExerciseCategory).all()],
        "muscleGroups": [{"id": mg.id, "name": mg.name} for mg in db.query(workout_model.ExerciseMuscleGroup).all()],
        "equipment": [{"id": eq.id, "name": eq.name} for eq in db.query(workout_model.ExerciseEquipment).all()],
        "difficultyLevels": [{"id": dl.id, "level": dl.level} for dl in db.query(workout_model.ExerciseDifficultyLevel).all()],
        "exerciseTypes": [{"id": et.id, "type": et.type} for et in db.query(workout_model.ExerciseType).all()]
    }

# Get a workout program by ID
@router.get("/workout-programs/{program_id}", response_model=workout_schema.WorkoutProgram)
def read_workout_program(program_id: int, db: Session = Depends(get_db)):
    program = workout_crud.get_workout_program_by_id(db, program_id=program_id)
    if not program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")
    
    return workout_schema.WorkoutProgram(
            program_id=program.program_id,
            user_id=program.user_id,
            name=program.name,
            days=[
                workout_schema.WorkoutDay(**day.__dict__) for day in program.workout_days
            ]
        )

# Get all of a user's workout programs
@router.get("/users/{user_id}/workout-programs", response_model=workout_schema.WorkoutProgramsResponse)
def read_user_workout_programs(user_id: int, include_archived: bool = Query(False, description="Include archived programs"), db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    programs, has_archived = workout_crud.get_user_workout_programs(db, user_id, include_archived)
    logger.debug(f"Retrieved {len(programs)} programs. Has archived: {has_archived}")
    return {"programs": programs, "has_archived": has_archived}

# Get a list of exercises for a specific day in a program
@router.get("/workout-programs/{program_id}/days/{day_name}/exercises", response_model=List[Dict])
def get_exercises_for_specific_day(program_id: int, day_name: str, db: Session = Depends(get_db)):
    exercises = workout_crud.get_exercises_for_specific_day(db, program_id, day_name)
    if not exercises:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No exercises found for this day in the program")
    
    return [
        {
            "program_exercise": workout_schema.ProgramExercise.model_validate(program_exercise),
            "exercise_name": exercise.name
        }
        for program_exercise, exercise in exercises
    ]

# Get the full workout program details of a specific workout program
@router.get("/workout-programs/{program_id}/program-details", response_model=List[Dict])
def read_workout_program_details(program_id: int, db: Session = Depends(get_db)):
    program_details = workout_crud.get_workout_program_details(db, program_id)
    if not program_details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")
    return program_details

# Log a workout session entry
@router.post("/users/{user_id}/workout-sessions", response_model=workout_schema.WorkoutSession)
def log_workout_session(user_id: int, session_data: workout_schema.WorkoutSessionCreate, db: Session = Depends(get_db)):
    logger.info(f"Received workout session data: {session_data.model_dump()}")
    try:
        logger.info("Attempting to log workout session...")
        workout_entry = workout_crud.log_workout_session(db, session_data, user_id)
        logger.info("Successfully logged workout session")
        return workout_schema.WorkoutSession.model_validate(workout_entry)
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error logging workout session: {str(e)}", exc_info=True)
        logger.debug(f"Session data: {session_data.model_dump()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/users/{user_id}/workout-sessions", response_model=List[workout_schema.WorkoutSession])
def get_user_workout_sessions(user_id: int, start_date: datetime = None, end_date: datetime = None, db: Session = Depends(get_db)):
    try:
        return workout_crud.get_workout_sessions(db, user_id, start_date, end_date)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
# Edit a workout program
@router.put("/workout-programs/{program_id}", response_model=workout_schema.WorkoutProgram)
def update_workout_program(program_id: int, program_update: workout_schema.WorkoutProgramUpdate, db: Session = Depends(get_db)):
    updated_program = workout_crud.update_workout_program(db, program_id, program_update)
    if not updated_program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")

    return workout_schema.WorkoutProgram.model_validate(updated_program)

# Delete a workout program
@router.delete("/workout-programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_program(program_id: int, db: Session = Depends(get_db)):
    try:
        workout_crud.delete_workout_program(db, program_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Workout program not found or unable to delete: {e}")
    return {"detail": "Workout program deleted successfully"}

# Archive a workout program
@router.put("/workout-programs/{program_id}/archive", status_code=status.HTTP_200_OK)
def archive_workout_program(program_id: int, db: Session = Depends(get_db)):
    return workout_crud.archive_workout_program(db, program_id)

# Unarchive a workout program
@router.put("/workout-programs/{program_id}/unarchive", status_code=status.HTTP_200_OK)
def unarchive_workout_program(program_id: int, db: Session = Depends(get_db)):
    return workout_crud.unarchive_workout_program(db, program_id)

# Get a user's workout data & progression
@router.get("/users/{user_id}/workout-progress", response_model=List[Dict])
def get_user_workout_progress(user_id: int, start_date: datetime = None, end_date: datetime = None, db: Session = Depends(get_db)):
    progress = workout_crud.get_user_workout_progress(db, user_id, start_date, end_date)
    return progress

# Get a user's running data & progression
@router.get("/users/{user_id}/running-progress", response_model=Dict)
def get_running_progress(user_id: int, db: Session = Depends(get_db)):
    return workout_crud.get_running_progress(db, user_id)

# Get a user's weight data & progresson
@router.get("/users/{user_id}/weight-progress", response_model=Dict)
def get_weight_progress(user_id: int, db: Session = Depends(get_db)):
    return workout_crud.get_weight_progress(db, user_id)

# TODO: Add admin authentication
@router.delete("/delete-all-workout-data", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_workout_data(db: Session = Depends(get_db)):
    try:
        # Delete data from tables in reverse order of dependencies
        db.query(workout_model.WorkoutSet).delete()
        db.query(workout_model.SessionExercise).delete()
        db.query(workout_model.WorkoutSession).delete()
        db.query(workout_model.ProgramExercise).delete()
        db.query(workout_model.WorkoutDay).delete()
        db.query(workout_model.WorkoutProgram).delete()
        
        # Only delete user-created exercises
        db.query(workout_model.Exercise).filter(workout_model.Exercise.is_global == False).delete()

        db.commit()
        return {"detail": "All workout data deleted successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    