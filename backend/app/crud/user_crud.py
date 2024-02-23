from sqlalchemy.orm import Session
from ..schemas import user_schema
from ..models import user_model, skill_model
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

    default_skills = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom']
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
