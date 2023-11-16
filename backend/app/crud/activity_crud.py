from sqlalchemy.orm import Session
from ..schemas.activity_schema import ActivityLog, WeightEntry
from ..models.activity_model import UserActivities, WeightTracking, ActivityStreak
from ..xp_calculator import calculate_meditation_xp, calculate_social_interaction_xp, calculate_running_xp, calculate_learning_xp, calculate_workout_xp, calculate_weight_tracking_xp, calculate_reflection_xp
from ..skill_manager import update_skill_xp
from .skill_crud import get_user_skills
from datetime import datetime, timedelta

def get_user_activity_streaks(db: Session, user_id: int):
    """
    Retrieve a user's activity streaks
    """
    return db.query(ActivityStreak).filter(ActivityStreak.user_id == user_id)

def log_activity(db: Session, user_id: int, activity_data: ActivityLog):
    """
    Log an activity for a user and update their skills' XP accordingly.
    """
    # Step 1: Log the activity
    new_activity = UserActivities(user_id=user_id, **activity_data.model_dump())
    db.add(new_activity)
    db.query(WeightTracking).filter()
    user_skills = get_user_skills(db, user_id)

    # Check if it's a new day
    for skill in user_skills:
        if skill.last_updated.date() < datetime.utcnow().date():
            skill.daily_xp_earned = 0

    # Step 2: Calculate XP based on activity type
    
    skill_xp_dict = {skill.name: skill.daily_xp_earned for skill in user_skills}

    xp_to_add = 0
    if activity_data.activity_type == "meditate":
        xp_to_add = calculate_meditation_xp(activity_data.duration, skill_xp_dict.get("Awareness", 0))
    elif activity_data.activity_type == "workout":
        xp_to_add = calculate_workout_xp(activity_data.volume, 0)  # Previous volume can be fetched as needed
    elif activity_data.activity_type == "run":
        xp_to_add = calculate_running_xp(activity_data.duration, activity_data.distance, skill_xp_dict.get("Endurance", 0))
    elif activity_data.activity_type == "socialize":
        xp_to_add = calculate_social_interaction_xp(activity_data.description)
    elif activity_data.activity_type == "read" or activity_data.activity_type == "take_class":
        xp_to_add = calculate_learning_xp(activity_data.activity_type, activity_data.duration, skill_xp_dict.get("Intelligence", 0))
    elif activity_data.activity_type == "reflect":
        xp_to_add = calculate_reflection_xp(skill_xp_dict.get("Wisdom", 0))

    # Step 3: Update Skill XP
    skill_name = map_activity_to_skill(activity_data.activity_type)
    update_skill_xp(db, user_id, skill_name, xp_to_add)
    new_activity.xp_earned = xp_to_add

    db.commit()
    return new_activity

def map_activity_to_skill(activity_type: str) -> str:
    """
    Map an activity type to the corresponding skill.
    """
    mapping = {
        "meditate" : "Awareness",
        "workout" : "Strength",
        "run" : "Endurance",
        "socialize" : "Charisma",
        "read" : "Intelligence",
        "take_class" : "Intelligence",
        "reflect" : "Wisdom"
    }

    return mapping.get(activity_type, "")

def log_weight_entry(db: Session, user_id: int, weight_entry: WeightEntry):
    """
    Log a weight entry for a user and update their skills' XP accordingly.
    """
    # Check if its first entry, if so, 
    first_entry = db.query(WeightTracking).filter(WeightTracking.user_id == user_id).first()
    is_first_entry = first_entry is None
    starting_weight = weight_entry.weight if is_first_entry else first_entry.weight
    # If it's the first entry or if a new weight goal is provided, update it
    weight_goal = weight_entry.weight_goal if is_first_entry or weight_entry.weight_goal is not None else first_entry.weight_goal

    # Create a new weight tracking record
    new_weight_entry = WeightTracking(
        user_id=user_id, 
        weight=weight_entry.weight, 
        date=weight_entry.date, 
        weight_goal=weight_entry.weight_goal,
        is_starting_weight=is_first_entry
    )
    db.add(new_weight_entry)

    # Fetch recent weight logs for XP calculation
    weight_logs = get_recent_weight_logs(db, user_id)

    # Calculate the XP for weight tracking
    if weight_logs and starting_weight is not None and weight_goal is not None:
        xp_to_add = calculate_weight_tracking_xp(weight_logs, starting_weight, weight_goal)
        # Update skill XP
        update_skill_xp(db, user_id, "Strength", xp_to_add)

    db.commit()
    return new_weight_entry

def get_recent_weight_logs(db: Session, user_id: int):
    """
    Fetch the user's weight logs from the past two weeks.
    """
    two_weeks_ago = datetime.utcnow().date() - timedelta(days=14)
    return db.query(WeightTracking).filter(
        WeightTracking.user_id == user_id,
        WeightTracking.date >= two_weeks_ago
    ).order_by(WeightTracking.date).all()
