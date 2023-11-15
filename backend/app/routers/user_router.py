from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from .. import crud, schemas, models
from ..dependencies import get_db
from typing import List

router = APIRouter()

# Create a user
@router.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    
    db_email = crud.get_user_by_email(db, email=user.email)
    if db_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
    
    return crud.create_user(db=db, user=user)

# Get a user by ID
@router.get("/users/id/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

# Get a user by username
@router.get("/users/username/{username}", response_model=schemas.User)
def read_user_by_username(username: str, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=username)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return db_user

# Get a user by email
@router.get("/users/email/{email}", response_model=schemas.User)
def read_user_by_email(email: str, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=email)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found")
    return db_user

# Get a list of users with pagination
@router.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = Query(0, alias="skip"), limit: int = Query(10, alias="limit"), db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

# Logs an activity (action) and rewards XP
@router.post("/users/{user_id}/log-activity/", response_model=schemas.ActivityLog)
def log_activity(user_id: int, activity_data: schemas.ActivityLog, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    logged_activity = crud.log_activity(db, user_id, activity_data)
    return logged_activity

# Log the user's weight and rewards XP
@router.post("/users/{user_id}/track-weight/", response_model=schemas.WeightEntry)
def track_weight(user_id: int, weight_entry: schemas.WeightEntry, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    

    logged_activity = crud.log_weight_entry(db, user_id, weight_entry)
    return logged_activity

# Gets the user's skills
@router.get("/users/{user_id}/skills/", response_model=List[schemas.Skill])
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return crud.get_user_skills(db, user_id)

# Get the user's activity streaks
@router.get("/users/{user_id}/activity-streaks/", response_model=List[schemas.ActivityStreak])
def get_user_activity_streaks(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return crud.get_user_activity_streaks(db, user_id)

# Create a workout program
@router.post("/workout-programs/", response_model=schemas.WorkoutProgram)
def create_workout_program(user_id: int, program: schemas.WorkoutProgramCreate, db: Session = Depends(get_db)):
    try:
        new_program = crud.create_workout_program(user_id=user_id, program=program, db=db)

        return schemas.WorkoutProgram(
            program_id=new_program.program_id,
            user_id=new_program.user_id,
            name=new_program.name,
            days=[schemas.WorkoutDay(**day.__dict__) for day in new_program.workout_days]
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
# Reset workout DB tables
@router.delete("/delete-all-workout-data/")
def delete_all_workout_data(db: Session = Depends(get_db)):
    try:
        # Deleting from child tables first
        db.query(models.WorkoutSessionExercise).delete()
        db.query(models.WorkoutProgramExercise).delete()
        db.query(models.WorkoutSession).delete()
        db.query(models.WorkoutDay).delete()
        db.query(models.WorkoutProgram).delete()
        
        db.commit()
        return {"detail": "All workout data deleted successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    