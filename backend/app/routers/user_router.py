from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import crud, schemas
from ..dependencies import get_db
from typing import List

router = APIRouter()

# Example route to create a user
@router.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

# Example route to get a user by ID
@router.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Logs an activity (action) and rewards XP
@router.post("/users/{user_id}/log-activity/", response_model=schemas.ActivityLog)
def log_activity(user_id: int, activity_data: schemas.ActivityLog, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    logged_activity = crud.log_activity(db, user_id, activity_data)
    return logged_activity

# Log the user's weight and rewards XP
@router.post("/users/{user_id}/track-weight/", response_model=schemas.WeightEntry)
def track_weight(user_id: int, weight_entry: schemas.WeightEntry, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    

    logged_activity = crud.log_weight_entry(db, user_id, weight_entry)
    return logged_activity

# Gets the user's skills
@router.get("/users/{user_id}/skills/", response_model=List[schemas.Skill])
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return crud.get_user_skills(db, user_id)

# Get the user's activity streaks
@router.get("/users/{user_id}/activity-streaks/", response_model=List[schemas.ActivityStreak])
def get_user_activity_streaks(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return crud.get_user_activity_streaks(db, user_id)