from sqlalchemy.orm import Session
from .models import skill_model

def update_skill_xp(db: Session, user_id: int, skill_name: str, xp_to_add: int):
    """
    Update the XP of a specific skill for a user.
    """
    skill = db.query(skill_model.Skill).filter(
        skill_model.Skill.user_id == user_id,
        skill_model.Skill.name == skill_name
    ).first()

    if skill:
        skill.xp += xp_to_add
        skill.daily_xp_earned += xp_to_add
        check_and_update_level(skill)
        db.commit()

def check_and_update_level(skill: skill_model.Skill):
    """
    Check if the skill should level up based on the current XP and update the level if necessary.
    """
    while skill.xp >= calculate_required_xp(skill.level):
        skill.xp -= calculate_required_xp(skill.level)
        skill.level += 1

def calculate_required_xp(level: int, base_xp: int = 100) -> int:
    """
    Calculate the required XP for the next level using the formula:
    XP required for next level = Base XP * (Current Level)^1.5

    :param level: Current level of the skill.
    :param base_xp: Base XP required for leveling up from level 1 to level 2. Default is 100.
    :return: The XP required to reach the next level.
    """
    return int(base_xp * (level ** 1.5))