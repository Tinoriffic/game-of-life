from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext

# Instantiate a CryptContext for hashing passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 10):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
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

def log_activity(db: Session, user_id: int, activity_type: str, description: str, xp_earned: int, duration: int = 0, volume: int = 0, distance: float = 0.0):
    db_activity = models.UserActivities(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        xp_earned=xp_earned,
        duration=duration,
        volume=volume,
        distance=distance,
    )
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity
