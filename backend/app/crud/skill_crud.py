from sqlalchemy.orm import Session
from ..models import Skill

def get_user_skills(db: Session, user_id: int):
    """
    Retrieve a user's skills
    """
    return db.query(Skill).filter(Skill.user_id == user_id)
