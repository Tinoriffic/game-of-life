from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from ..schemas import workout_schema
from ..models import workout_model
from ..crud import workout_crud, user_crud
from ..dependencies import get_db
from typing import List, Dict
import logging

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

        return workout_schema.WorkoutProgram(
            program_id=new_program.program_id,
            user_id=new_program.user_id,
            name=new_program.name,
            days=[workout_schema.WorkoutDay(**day.__dict__) for day in new_program.workout_days]
        )
    except TypeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
# Get a workout program by ID
@router.get("/workout-programs/{program_id}", response_model=workout_schema.WorkoutProgram)
def read_workout_program(program_id: int, db: Session = Depends(get_db)):
    program = workout_crud.get_workout_program(db, program_id=program_id)
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
    
    program_data = []
    for program in programs:
        days = []
        for day in program.workout_days:
            exercises = []
            for exercise in day.exercises:
                exercises.append({
                    "program_exercise_id": exercise.program_exercise_id,
                    "exercise_id": exercise.exercise_id,
                    "name": exercise.exercise.name,
                    "sets": exercise.sets,
                    "recommended_reps": exercise.recommended_reps,
                    "recommended_weight": exercise.recommended_weight
                })
            days.append({
                "day_id": day.day_id,
                "program_id": day.program_id,
                "day_name": day.day_name,
                "exercises": exercises
            })
        program_data.append(workout_schema.WorkoutProgramWithExercises(
            program_id=program.program_id,
            user_id=program.user_id,
            name=program.name,
            status=program.status,
            archived_at=program.archived_at,
            days=days
        ))

    logger.debug(f"Constructed {len(program_data)} program data objects")

    response = workout_schema.WorkoutProgramsResponse(programs=program_data, has_archived=has_archived)
    logger.debug(f"Constructed response: {response}")
    
    return response

# Get a list of exercises for a specific day in a program
@router.get("/workout-programs/{program_id}/exercises", response_model=List[workout_schema.WorkoutProgramExerciseResponse])
def get_workout_program_exercises(program_id: int, day_name: str, db: Session = Depends(get_db)):
    if not workout_crud.get_workout_program(db, program_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")

    # Check if the day exists in the program
    if not workout_crud.get_workout_day_by_name(db, program_id, day_name):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified workout day not found in the program")

    exercises = workout_crud.get_exercises_for_specific_day(db, program_id, day_name)
    return [workout_schema.WorkoutProgramExerciseResponse(program_exercise_id=exercise[0].program_exercise_id, exercise_name=exercise[1]) for exercise in exercises]

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
    return workout_crud.log_workout_session(db, session_data, user_id)

@router.get("/users/{user_id}/workout-sessions", response_model=List[workout_schema.WorkoutSessionExercise])
def get_user_workout_sessions(user_id: int, db: Session = Depends(get_db)):
    try:
        return workout_crud.get_workout_sessions(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
# Edit a workout program
@router.put("/workout-programs/{program_id}", response_model=workout_schema.WorkoutProgram)
def update_workout_program(program_id: int, program: workout_schema.WorkoutProgramCreate, db: Session = Depends(get_db)):
    updated_program = workout_crud.update_workout_program(db, program_id, program)
    if not updated_program:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")

    return workout_schema.WorkoutProgram(
        program_id=updated_program.program_id,
        user_id=updated_program.user_id,
        name=updated_program.name,
        days=[workout_schema.WorkoutDay(**day.__dict__) for day in updated_program.workout_days]
    )

# Delete a workout program
@router.delete("/workout-programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_program(program_id: int, db: Session = Depends(get_db)):
    try:
        workout_crud.delete_workout_program(db, program_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Workout progrm not found or unable to delete: {e}")
    return {"detail": "Workout program deleted successfully"}

# Archive a workout program
@router.put("/workout-programs/{program_id}/archive", status_code=status.HTTP_200_OK)
def archive_workout_program(program_id: int, db: Session = Depends(get_db)):
    return workout_crud.archive_workout_program(db, program_id)

# Unarchive a workout program
@router.put("/workout-programs/{program_id}/unarchive", status_code=status.HTTP_200_OK)
def unarchive_workout_program(program_id: int, db: Session = Depends(get_db)):
    return workout_crud.unarchive_workout_program(db, program_id)

# Reset workout DB tables
@router.delete("/delete-all-workout-data")
def delete_all_workout_data(db: Session = Depends(get_db)):
    try:
        # Deleting from child tables first
        db.query(workout_model.WorkoutSessionExercise).delete()
        db.query(workout_model.WorkoutProgramExercise).delete()
        db.query(workout_model.WorkoutSession).delete()
        db.query(workout_model.WorkoutDay).delete()
        db.query(workout_model.WorkoutProgram).delete()
        
        db.commit()
        return {"detail": "All workout data deleted successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    