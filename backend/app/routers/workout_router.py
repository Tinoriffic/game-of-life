from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas import workout_schema
from ..models import workout_model
from ..crud import workout_crud, user_crud
from ..dependencies import get_db
from typing import List

router = APIRouter()

# Workout Endpoints

# Create a workout program
@router.post("/workout-programs/", response_model=workout_schema.WorkoutProgram)
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
@router.get("/users/{user_id}/workout-programs", response_model=List[workout_schema.WorkoutProgram])
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
    
# Reset workout DB tables
@router.delete("/delete-all-workout-data/")
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