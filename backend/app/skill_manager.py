# skill_manager.py
from sqlalchemy.orm import Session
from . import models

def update_skill_xp(db: Session, user_id: int, skill_name: str, xp_to_add: int):
    """
    Update the XP of a specific skill for a user.
    """
    skill = db.query(models.Skill).filter(
        models.Skill.user_id == user_id,
        models.Skill.name == skill_name
    ).first()

    if skill:
        skill.xp += xp_to_add
        skill.daily_xp_earned += xp_to_add
        check_and_update_level(skill)
        db.commit()

def check_and_update_level(skill: models.Skill):
    """
    Check if the skill should level up based on the current XP and update the level if necessary.
    """
    while skill.xp >= calculate_required_xp(skill.level):
        skill.xp -= calculate_required_xp(skill.level)
        skill.level += 1
        # Reset daily XP earned on level up, if desired
        # skill.daily_xp_earned = 0
