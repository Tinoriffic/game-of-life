from sqlalchemy.orm import Session
from ..models import skill_model

def get_user_skills(db: Session, user_id: int):
    """
    Retrieve a user's skills
    """
    return db.query(skill_model.Skill).filter(skill_model.Skill.user_id == user_id)
