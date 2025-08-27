"""
Admin-specific CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List

from ..models.challenge_model import Challenge, UserChallenge
from ..models.user_model import User, UserRole


def get_all_challenges(db: Session, include_inactive: bool = True) -> List[Challenge]:
    """
    Get all challenges including inactive ones (admin only)
    """
    query = db.query(Challenge)
    if not include_inactive:
        query = query.filter(Challenge.is_active == True)
    return query.all()


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """
    Get all users with pagination (admin only)
    """
    return db.query(User).offset(skip).limit(limit).all()


def toggle_challenge_active_status(db: Session, challenge_id: int) -> Challenge:
    """
    Toggle a challenge's active status (admin only)
    """
    challenge = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not challenge:
        raise ValueError("Challenge not found")
    
    challenge.is_active = not challenge.is_active
    db.commit()
    db.refresh(challenge)
    return challenge


def set_user_role(db: Session, user_id: int, role: UserRole) -> User:
    """
    Set a user's role (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found")
    
    user.role = role
    db.commit()
    db.refresh(user)
    return user


def get_system_stats(db: Session) -> dict:
    """
    Get system statistics (admin only)
    """
    total_users = db.query(User).count()
    total_challenges = db.query(Challenge).count()
    active_challenges = db.query(Challenge).filter(Challenge.is_active == True).count()
    active_user_challenges = db.query(UserChallenge).filter(
        UserChallenge.is_completed == False,
        UserChallenge.is_failed == False,
        UserChallenge.is_active == True
    ).count()
    
    return {
        "total_users": total_users,
        "total_challenges": total_challenges,
        "active_challenges": active_challenges,
        "users_with_active_challenges": active_user_challenges
    }