import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..schemas import activity_schema
from ..models import activity_model
from ..xp_calculator import calculate_meditation_xp, calculate_social_interaction_xp, calculate_running_xp, calculate_learning_xp, calculate_weight_tracking_xp, calculate_reflection_xp
from ..skill_manager import update_skill_xp
from ..utils.time import utc_now, utc_today, get_user_today, validate_activity_date
from .skill_crud import get_user_skills
from datetime import timedelta, date
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

def get_user_activity_streaks(db: Session, user_id: int):
    """Retrieve a user's activity streaks."""
    return db.query(activity_model.ActivityStreak).filter(activity_model.ActivityStreak.user_id == user_id)

def log_activity(db: Session, user_id: int, activity_data: activity_schema.ActivityLog, is_admin: bool = False):
    """
    Log an activity for a user and update their skills' XP accordingly.
    Raises ValueError if the activity date is not valid for this user.
    """
    # Step 1: Validate the activity date
    activity_date_to_validate = activity_data.date.date() if activity_data.date else None
    is_valid, error_msg, validated_date = validate_activity_date(
        db, user_id, activity_date_to_validate, is_admin
    )

    if not is_valid:
        raise ValueError(error_msg)

    # Step 2: Create the activity record
    activity_dict = activity_data.model_dump()

    # If no date provided, use current timestamp
    if activity_dict['date'] is None:
        activity_dict['date'] = utc_now()

    new_activity = activity_model.UserActivities(user_id=user_id, **activity_dict)
    db.add(new_activity)
    user_skills = get_user_skills(db, user_id)

    # Check if it's a new day (in user's timezone)
    user_today = get_user_today(db, user_id)

    for skill in user_skills:
        # Convert UTC timestamp to date and compare with user's today
        if skill.last_updated.date() < user_today:
            skill.daily_xp_earned = 0

    # Step 2: Calculate XP based on activity type
    
    skill_xp_dict = {skill.name: skill.daily_xp_earned for skill in user_skills}

    xp_to_add = 0
    if activity_data.activity_type == "meditate":
        xp_to_add = calculate_meditation_xp(activity_data.duration, skill_xp_dict.get("Awareness", 0))
    elif activity_data.activity_type == "run":
        xp_to_add = calculate_running_xp(activity_data.duration, activity_data.distance, skill_xp_dict.get("Endurance", 0))
    elif activity_data.activity_type == "socialize":
        xp_to_add = calculate_social_interaction_xp(activity_data.description)
    elif activity_data.activity_type == "read" or activity_data.activity_type == "take_class":
        xp_to_add = calculate_learning_xp(activity_data.activity_type, activity_data.duration, skill_xp_dict.get("Intelligence", 0))
    elif activity_data.activity_type == "journal":
        xp_to_add = calculate_reflection_xp(skill_xp_dict.get("Wisdom", 0))
        # Award XP to both Wisdom and Creativity for journaling
        update_skill_xp(db, user_id, "Wisdom", xp_to_add)
        update_skill_xp(db, user_id, "Creativity", xp_to_add)
        # Skip the regular skill mapping below for journal
        new_activity.xp_earned = xp_to_add
        update_activity_streak(db, user_id, activity_data.activity_type, validated_date)
        db.commit()
        return new_activity

    # Step 3: Update Skill XP
    skill_name = map_activity_to_skill(activity_data.activity_type)
    update_skill_xp(db, user_id, skill_name, xp_to_add)
    new_activity.xp_earned = xp_to_add
    update_activity_streak(db, user_id, activity_data.activity_type, validated_date)

    db.commit()
    return new_activity

def map_activity_to_skill(activity_type: str) -> str:
    """
    Map an activity type to the corresponding skill.
    """
    mapping = {
        "meditate" : "Awareness",
        "run" : "Endurance",
        "socialize" : "Charisma",
        "read" : "Intelligence",
        "take_class" : "Intelligence",
        "journal" : "Wisdom"
    }

    return mapping.get(activity_type, "")

def log_weight_entry(db: Session, user_id: int, weight_entry: activity_schema.WeightEntry, is_admin: bool = False):
    """
    Log a weight entry for a user and update their skills' XP accordingly.
    Raises ValueError if the weight entry date is not valid for this user.
    """
    # Validate the weight entry date
    is_valid, error_msg, validated_date = validate_activity_date(
        db, user_id, weight_entry.date, is_admin
    )

    if not is_valid:
        raise ValueError(error_msg)

    # Check if it's the first entry
    first_entry = db.query(activity_model.WeightTracking)\
                    .filter(activity_model.WeightTracking.user_id == user_id)\
                    .order_by(activity_model.WeightTracking.date)\
                    .first()
    is_first_entry = first_entry is None
    
    # If it's the first entry or if a new weight goal is provided, update it
    weight_goal = weight_entry.weight_goal if is_first_entry or weight_entry.weight_goal is not None else first_entry.weight_goal

    # Create a new weight tracking record
    new_weight_entry = activity_model.WeightTracking(
        user_id=user_id, 
        weight=weight_entry.weight, 
        date=weight_entry.date, 
        weight_goal=weight_goal,
        is_starting_weight=is_first_entry
    )
    db.add(new_weight_entry)

    # Fetch all weight logs for XP calculation
    weight_logs = db.query(activity_model.WeightTracking)\
                .filter(activity_model.WeightTracking.user_id == user_id)\
                .order_by(activity_model.WeightTracking.date)\
                .all()

    # Calculate the XP for weight tracking
    starting_weight = weight_logs[0].weight if weight_logs else weight_entry.weight
    xp_to_add = calculate_weight_tracking_xp(weight_logs, starting_weight, weight_goal)

    update_skill_xp(db, user_id, "Strength", xp_to_add)
    update_activity_streak(db, user_id, "weight_tracking", validated_date)

    db.commit()
    return new_weight_entry

def get_recent_weight_logs(db: Session, user_id: int) -> Tuple[List[activity_model.WeightTracking], Optional[float]]:
    """
    Fetch the user's weight logs from the past two weeks.
    """
    logger.info(f"Fetching recent weight logs for user {user_id}")
    two_weeks_ago = utc_today() - timedelta(days=14)
    
    subquery = db.query(
        activity_model.WeightTracking.date,
        func.max(activity_model.WeightTracking.id).label('max_id')
    ).filter(
        activity_model.WeightTracking.user_id == user_id,
        activity_model.WeightTracking.date >= two_weeks_ago
    ).group_by(activity_model.WeightTracking.date).subquery()

    recent_logs = db.query(activity_model.WeightTracking).join(
        subquery,
        (activity_model.WeightTracking.id == subquery.c.max_id) &
        (activity_model.WeightTracking.date == subquery.c.date)
    ).order_by(activity_model.WeightTracking.date.desc()).all()

    logger.info(f"Found {len(recent_logs)} recent weight logs")
    for log in recent_logs:
        logger.debug(f"Log: id={log.id}, date={log.date}, weight={log.weight}, goal={log.weight_goal}")

    # Get the latest weight goal from the most recent entry
    latest_weight_goal = recent_logs[0].weight_goal if recent_logs else None
    logger.info(f"Latest weight goal: {latest_weight_goal}")

    if latest_weight_goal is None:
        logger.warning(f"No weight goal found for user {user_id}")

    return recent_logs, latest_weight_goal

def update_activity_streak(db: Session, user_id: int, activity_type: str, activity_date: Optional[date] = None):
    """
    Update user's activity streak for a given activity type.
    If activity_date is None, uses today in user's timezone.
    """
    from ..utils.time import get_user_today

    # If no date provided, use today in user's timezone
    if activity_date is None:
        activity_date = get_user_today(db, user_id)

    streak = db.query(activity_model.ActivityStreak)\
               .filter_by(user_id=user_id, activity_type=activity_type)\
               .first()

    if streak:
        if streak.last_activity_date == activity_date - timedelta(days=1):
            # If last activity is yesterday (relative to activity_date) -> increment streak
            streak.current_streak += 1
        elif streak.last_activity_date == activity_date:
            # Already logged for this date -> don't update streak
            pass
        elif streak.last_activity_date < activity_date - timedelta(days=1):
            # Missed days -> reset streak to 1
            streak.current_streak = 1

        # Only update last_activity_date if this activity is more recent
        if activity_date > streak.last_activity_date:
            streak.last_activity_date = activity_date
    else:
        # New streak
        streak = activity_model.ActivityStreak(
            user_id=user_id,
            activity_type=activity_type,
            current_streak=1,
            last_activity_date=activity_date
        )
        db.add(streak)

def get_daily_activities(db: Session, user_id: int):
    thirty_days_ago = utc_now() - timedelta(days=30)
    activities = db.query(activity_model.UserActivities).filter(
        activity_model.UserActivities.user_id == user_id,
        activity_model.UserActivities.date >= thirty_days_ago
    ).all()

    activity_summary = {}
    for activity in activities:
        date = activity.date.strftime("%Y-%m-%d")
        if date not in activity_summary:
            activity_summary[date] = {}
        if activity.activity_type not in activity_summary[date]:
            activity_summary[date][activity.activity_type] = 0
        activity_summary[date][activity.activity_type] += 1

    return [{"date": date, "activities": acts} for date, acts in activity_summary.items()]
