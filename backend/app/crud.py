from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext
from .xp_calculator import calculate_meditation_xp, calculate_social_interaction_xp, calculate_running_xp, calculate_learning_xp, calculate_workout_xp, calculate_weight_tracking_xp, calculate_reflection_xp
from .skill_manager import update_skill_xp
from datetime import datetime, timedelta

# Instantiate a CryptContext for hashing passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(db: Session, user_id: int):
    """
    Retrieve a user's data by user_id
    """
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    """
    Retrieve a user's data by username
    """
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 10):
    """
    Retrieves a list of users, limit of 10
    """
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    """
    Creates a new user given a username and password
    """
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    default_skills = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom']
    for skill in default_skills:
        db_skill = models.Skill(name=skill, user_id=db_user.id)
        db.add(db_skill)
    db.commit()

    return db_user

def log_activity(db: Session, user_id: int, activity_data: schemas.ActivityLog):
    """
    Log an activity for a user and update their skills' XP accordingly.
    """
    # Step 1: Log the activity
    db_activity = models.UserActivities(user_id=user_id, **activity_data.model_dump())
    db.add(db_activity)
    db.query(models.WeightTracking).filter()

    # Step 2: Calculate XP based on activity type
    xp_to_add = 0
    if activity_data.activity_type == "meditate":
        xp_to_add = calculate_meditation_xp(activity_data.duration)
    elif activity_data.activity_type == "workout":
        xp_to_add = calculate_workout_xp(activity_data.volume, 0)  # Previous volume can be fetched as needed
    elif activity_data.activity_type == "track_weight":
        weight_logs = get_recent_weight_logs(db, user_id)
        starting_weight, weight_goal = get_user_weight_goal_and_starting_weight(db, user_id)
        if weight_logs and starting_weight is not None and weight_goal is not None:
            xp_to_add = calculate_weight_tracking_xp(weight_logs, starting_weight, weight_goal)
    elif activity_data.activity_type == "run":
        xp_to_add = calculate_running_xp(activity_data.duration, activity_data.distance)
    elif activity_data.activity_type == "socialize":
        xp_to_add = calculate_social_interaction_xp(activity_data.activity_type)
    elif activity_data.activity_type == "learn":
        xp_to_add = calculate_learning_xp(activity_data.activity_type, activity_data.duration)
    elif activity_data.activity_type == "reflect":
        xp_to_add = calculate_reflection_xp()

    # Step 3: Update Skill XP
    skill_name = map_activity_to_skill(activity_data.activity_type)
    update_skill_xp(db, user_id, skill_name, xp_to_add)

    db.commit()
    return db_activity

def map_activity_to_skill(activity_type: str) -> str:
    """
    Map an activity type to the corresponding skill.
    """
    mapping = {
        "meditate" : "awareness",
        "workout" : "strength",
        "track_weight" : "strength",
        "run" : "endurance",
        "socialize" : "charisma",
        "learn" : "intelligence",
        "reflect" : "wisdom"
    }

    return mapping.get(activity_type, "")

def get_recent_weight_logs(db: Session, user_id: int):
    """
    Fetch the user's weight logs from the past two weeks.
    """
    two_weeks_ago = datetime.utcnow().date() - timedelta(days=14)
    return db.query(models.WeightTracking).filter(
        models.WeightTracking.user_id == user_id,
        models.WeightTracking.date >= two_weeks_ago
    ).order_by(models.WeightTracking.date).all()

def get_user_weight_goal_and_starting_weight(db: Session, user_id: int):
    """
    Fetch the user's starting weight and weight goal.
    """
    first_entry = db.query(models.WeightTracking).filter(
        models.WeightTracking.user_id == user_id
    ).order_by(models.WeightTracking.date).first()

    if first_entry is None:
        return None, None

    return first_entry.weight, first_entry.weight_goal

