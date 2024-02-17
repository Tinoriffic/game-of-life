from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas import workout_schema
from ..models import workout_model
from ..crud import workout_crud, user_crud
from ..dependencies import get_db
from typing import List, Dict

router = APIRouter()

# Workout Endpoints

# Create a workout program
@router.post("/api/workout-programs/", response_model=workout_schema.WorkoutProgram)
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
@router.get("/api/workout-programs/{program_id}", response_model=workout_schema.WorkoutProgram)
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
@router.get("/api/users/{user_id}/workout-programs", response_model=List[workout_schema.WorkoutProgram])
def read_user_workout_programs(user_id: int, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    programs = workout_crud.get_user_workout_programs(db, user_id=user_id)
    return [
        workout_schema.WorkoutProgram(
            program_id=program.program_id,
            user_id=program.user_id,
            name=program.name,
            days=[
                workout_schema.WorkoutDay(**day.__dict__) for day in program.workout_days
            ]
        ) for program in programs
    ]

# Get a list of exercises for a specific day in a program
@router.get("/api/workout-programs/{program_id}/exercises", response_model=List[workout_schema.WorkoutProgramExerciseResponse])
def get_workout_program_exercises(program_id: int, day_name: str, db: Session = Depends(get_db)):
    if not workout_crud.get_workout_program(db, program_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")

    # Check if the day exists in the program
    if not workout_crud.get_workout_day_by_name(db, program_id, day_name):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified workout day not found in the program")

    exercises = workout_crud.get_exercises_for_specific_day(db, program_id, day_name)
    return [workout_schema.WorkoutProgramExerciseResponse(program_exercise_id=exercise[0].program_exercise_id, exercise_name=exercise[1]) for exercise in exercises]

# Get the full workout program details of a specific workout program
@router.get("/api/workout-programs/{program_id}/program-details", response_model=List[Dict])
def read_workout_program_details(program_id: int, db: Session = Depends(get_db)):
    program_details = workout_crud.get_workout_program_details(db, program_id)
    if not program_details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout program not found")
    return program_details

# Log a workout session entry
@router.post("/api/users/{user_id}/workout-sessions/", response_model=workout_schema.WorkoutSession)
def log_workout_session(user_id: int, session_data: workout_schema.WorkoutSessionCreate, db: Session = Depends(get_db)):
    return workout_crud.log_workout_session(db, session_data, user_id)

@router.get("/api/users/{user_id}/workout-sessions/", response_model=List[workout_schema.WorkoutSessionExercise])
def get_user_workout_sessions(user_id: int, db: Session = Depends(get_db)):
    try:
        return workout_crud.get_workout_sessions(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
# Delete a workout program
@router.delete("/api/workout-programs/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_program(program_id: int, db: Session = Depends(get_db)):
    try:
        workout_crud.delete_workout_program(db, program_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Workout progrm not found or unable to delete: {e}")
    return {"detail": "Workout program deleted successfully"}

# Reset workout DB tables
@router.delete("/api/delete-all-workout-data/")
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
    