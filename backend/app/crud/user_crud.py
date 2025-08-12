from sqlalchemy.orm import Session
from ..schemas import user_schema
from ..models import user_model, skill_model, activity_model
from ..skill_manager import calculate_required_xp, calculate_activity_streak, calculate_level
from ..crud import activity_crud, workout_crud
from passlib.context import CryptContext

# Instantiate a CryptContext for hashing passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(db: Session, user_id: int):
    """
    Retrieve a user's data by user_id
    """
    return db.query(user_model.User).filter(user_model.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    """
    Retrieve a user's data by username
    """
    return db.query(user_model.User).filter(user_model.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    """
    Retrieve a user's data by username
    """
    return db.query(user_model.User).filter(user_model.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 10):
    """
    Retrieves a list of users, limit of 10
    """
    return db.query(user_model.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: user_schema.UserCreate):
    """
    Creates a new user given a username and password
    """
    new_user = user_model.User(
        username=user.username,
        hashed_password=pwd_context.hash(user.password) if user.password else None,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        city=user.city,
        occupation=user.occupation,
        avatar_url=user.avatar_url if user.avatar_url else None)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    default_skills = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom', 'Resilience']
    for skill in default_skills:
        db_skill = skill_model.Skill(name=skill, user_id=new_user.id)
        db.add(db_skill)
    db.commit()

    return new_user

def delete_user(db: Session, user_id: int):
    """
    Deletes a user given their id
    """
    user_to_delete = db.query(user_model.User).filter(user_model.User.id == user_id).first()
    if user_to_delete is None:
        return None
    db.delete(user_to_delete)
    db.commit()
    return user_to_delete

def get_user_stats(db: Session, user_id: int):
    user = get_user(db, user_id=user_id)
    if not user:
        return None

    overall_progress = get_user_overall_progress(db, user)
    skills_progress = get_skills_progress(db, user)
    weight_progress = workout_crud.get_weight_progress(db, user_id)
    running_progress = workout_crud.get_running_progress(db, user_id)
    workout_progress = workout_crud.get_workout_progress(db, user_id)
    daily_activities = activity_crud.get_daily_activities(db, user_id)

    return {
        "overall": overall_progress,
        "weight": weight_progress,
        "running": running_progress,
        "strength": workout_progress,
        "skills": skills_progress,
        "activities": daily_activities
    }

def get_user_overall_progress(db: Session, user):
    """
    Get a user's overall stats including information about their XP & days active
    """
    total_xp = sum(skill.xp for skill in user.skills)
    level = calculate_level(total_xp)
    xp_to_next_level = calculate_required_xp(level)

    activities = db.query(activity_model.UserActivities).filter(
        activity_model.UserActivities.user_id == user.id
    ).order_by(activity_model.UserActivities.date.desc()).all()

    days_active = len(set(activity.date.date() for activity in activities))
    activity_streak = calculate_activity_streak(activities)

    return {
        "level": level,
        "xp": total_xp,
        "xpToNextLevel": xp_to_next_level,
        "daysActive": days_active,
        "activityStreak": activity_streak
    }

def get_skills_progress(db: Session, user):
    skills = db.query(skill_model.Skill).filter(skill_model.Skill.user_id == user.id).all()
    return [
        {
            "name": skill.name,
            "level": skill.level,
            "xp": skill.xp,
            "xpToNextLevel": calculate_required_xp(skill.level + 1) - skill.xp
        }
        for skill in skills
    ]
