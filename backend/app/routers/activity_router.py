from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas import activity_schema
from ..crud import activity_crud, user_crud
from ..dependencies import get_db
from typing import List

router = APIRouter()

# Activity Endpoints

# Logs an activity (action) and rewards XP
@router.post("/api/users/{user_id}/log-activity/", response_model=activity_schema.ActivityLog)
def log_activity(user_id: int, activity_data: activity_schema.ActivityLog, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    logged_activity = activity_crud.log_activity(db, user_id, activity_data)
    return logged_activity

# Log the user's weight and rewards XP
@router.post("/api/users/{user_id}/track-weight/", response_model=activity_schema.WeightEntry)
def track_weight(user_id: int, weight_entry: activity_schema.WeightEntry, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    logged_activity = activity_crud.log_weight_entry(db, user_id, weight_entry)
    return logged_activity

# Get the user's activity streaks
@router.get("/api/users/{user_id}/activity-streaks/", response_model=List[activity_schema.ActivityStreak])
def get_user_activity_streaks(user_id: int, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return activity_crud.get_user_activity_streaks(db, user_id)
