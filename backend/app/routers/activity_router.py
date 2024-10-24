import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas import activity_schema
from ..crud import activity_crud, user_crud
from ..dependencies import get_db
from typing import List

router = APIRouter()
logger = logging.getLogger(__name__)

# Activity Endpoints

# Logs an activity (action) and rewards XP
@router.post("/users/{user_id}/log-activity/", response_model=activity_schema.ActivityLog)
def log_activity(user_id: int, activity_data: activity_schema.ActivityLog, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    logged_activity = activity_crud.log_activity(db, user_id, activity_data)
    return logged_activity

# Log the user's weight and rewards XP
@router.post("/users/{user_id}/track-weight/", response_model=activity_schema.WeightEntry)
def track_weight(user_id: int, weight_entry: activity_schema.WeightEntry, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    logged_activity = activity_crud.log_weight_entry(db, user_id, weight_entry)
    return logged_activity

def weight_tracking_to_dict(weight_tracking):
    return {
        "id": weight_tracking.id,
        "user_id": weight_tracking.user_id,
        "weight": weight_tracking.weight,
        "date": weight_tracking.date,
        "weight_goal": weight_tracking.weight_goal,
        "is_starting_weight": weight_tracking.is_starting_weight
    }

@router.get("/users/{user_id}/weight/logs/", response_model=activity_schema.WeightLogsResponse)
def get_weight_logs(user_id: int, db: Session = Depends(get_db)):
    try:
        logs, latest_weight_goal = activity_crud.get_recent_weight_logs(db, user_id)
        if not logs:
            logger.warning(f"No weight logs found for user {user_id}")
            # raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Weight logs not found")
        
        # Convert SQLAlchemy model instances to dictionaries
        log_dicts = [weight_tracking_to_dict(log) for log in logs]
        
        logger.info(f"Successfully retrieved {len(logs)} weight logs for user {user_id}")
        return activity_schema.WeightLogsResponse(logs=log_dicts, latestWeightGoal=latest_weight_goal)
    except HTTPException as http_exc:
        logger.error(f"HTTPException occurred: {http_exc.detail}")
        raise http_exc  # Re-raise to allow FastAPI to handle it properly
    except Exception as e:
        logger.error(f"Error retrieving weight logs for user {user_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while retrieving weight logs")

# Get the user's activity streaks
@router.get("/users/{user_id}/activity-streaks/", response_model=List[activity_schema.ActivityStreak])
def get_user_activity_streaks(user_id: int, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return activity_crud.get_user_activity_streaks(db, user_id)
