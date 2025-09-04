from sqlalchemy.orm import Session
from ..models import skill_model

def get_user_skills(db: Session, user_id: int):
    """
    Retrieve a user's skills
    """
    skill_order = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom', 'Resilience', 'Creativity']
    
    skills = db.query(skill_model.Skill).filter(skill_model.Skill.user_id == user_id).all()
    
    # Sort skills according to the defined order
    skills_dict = {skill.name: skill for skill in skills}
    ordered_skills = [skills_dict[skill_name] for skill_name in skill_order if skill_name in skills_dict]
    
    return ordered_skills
