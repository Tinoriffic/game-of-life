from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta, timezone, date
from typing import List, Optional

from ..models.challenge_model import Challenge, UserChallenge, ChallengeProgress, Badge, UserBadge
from ..models.user_model import User
from ..schemas import challenge_schema
from ..skill_manager import update_skill_xp

def get_available_challenges(db: Session) -> List[Challenge]:
    """
    Get all active challenges available for users to join
    """
    return db.query(Challenge).filter(Challenge.is_active == True).all()

def get_challenge_by_id(db: Session, challenge_id: int) -> Optional[Challenge]:
    """
    Get a specific challenge by ID
    """
    return db.query(Challenge).filter(Challenge.id == challenge_id).first()

def check_and_fail_expired_challenges(db: Session, user_id: int = None):
    """
    Check for challenges that should be failed due to missed days
    If user_id is provided, check only that user's challenges
    Otherwise, check all active challenges
    """
    query = db.query(UserChallenge).filter(
        and_(
            UserChallenge.is_active == True,
            UserChallenge.is_completed == False,
            UserChallenge.is_failed == False
        )
    )
    
    if user_id:
        query = query.filter(UserChallenge.user_id == user_id)
    
    active_challenges = query.all()
    today = datetime.now(timezone.utc).date()
    
    for user_challenge in active_challenges:
        # Check if challenge period is over
        if today > user_challenge.end_date:
            user_challenge.is_failed = True
            user_challenge.is_active = False
            continue
            
        # Calculate expected days completed by now
        current_day = (today - user_challenge.start_date).days + 1
        completed_days = len(user_challenge.progress_entries)
        
        # If we're past the start date and missing any previous days, fail the challenge
        # (Allow current day to be incomplete, but not previous days)
        if current_day > 1 and completed_days < (current_day - 1):
            user_challenge.is_failed = True
            user_challenge.is_active = False
    
    db.commit()

def get_user_active_challenge(db: Session, user_id: int) -> Optional[UserChallenge]:
    """
    Get user's currently active challenge (if any)
    Automatically checks for expired challenges first
    """
    # Check for expired challenges before returning
    check_and_fail_expired_challenges(db, user_id)
    
    return db.query(UserChallenge).filter(
        and_(
            UserChallenge.user_id == user_id,
            UserChallenge.is_active == True,
            UserChallenge.is_completed == False,
            UserChallenge.is_failed == False
        )
    ).first()

def get_user_challenge_history(db: Session, user_id: int, skip: int = 0, limit: int = 10) -> List[UserChallenge]:
    """
    Get user's challenge history (completed, failed, or quit challenges)
    """
    return db.query(UserChallenge).filter(
        and_(
            UserChallenge.user_id == user_id,
            UserChallenge.is_active == False
        )
    ).order_by(UserChallenge.start_date.desc()).offset(skip).limit(limit).all()

def join_challenge(db: Session, user_id: int, challenge_id: int) -> UserChallenge:
    """
    Join a challenge. Only one active challenge per user is allowed.
    """
    # Check if user already has an active challenge
    existing_challenge = get_user_active_challenge(db, user_id)
    if existing_challenge:
        raise ValueError("User already has an active challenge")
    
    challenge = get_challenge_by_id(db, challenge_id)
    if not challenge:
        raise ValueError("Challenge not found")
    
    if not challenge.is_active:
        raise ValueError("Challenge is not active")
    
    # Create user challenge
    start_date = datetime.now(timezone.utc).date()
    end_date = start_date + timedelta(days=challenge.duration_days - 1)  # -1 because start day counts as day 1
    
    user_challenge = UserChallenge(
        user_id=user_id,
        challenge_id=challenge_id,
        start_date=start_date,
        end_date=end_date,
        is_active=True,
        is_completed=False,
        is_failed=False
    )
    
    db.add(user_challenge)
    db.commit()
    db.refresh(user_challenge)
    return user_challenge

def quit_challenge(db: Session, user_id: int) -> Optional[UserChallenge]:
    """
    Quit the user's active challenge
    """
    user_challenge = get_user_active_challenge(db, user_id)
    if not user_challenge:
        return None
    
    user_challenge.is_active = False
    user_challenge.quit_date = datetime.now(timezone.utc).date()
    
    db.commit()
    db.refresh(user_challenge)
    return user_challenge

def mark_day_complete(db: Session, user_id: int, activity_data: dict = None) -> Optional[ChallengeProgress]:
    """
    Mark today as complete for the user's active challenge
    """
    user_challenge = get_user_active_challenge(db, user_id)
    if not user_challenge:
        raise ValueError("No active challenge found")
    
    today = datetime.now(timezone.utc).date()
    
    # Check if today is within the challenge period
    if today < user_challenge.start_date or today > user_challenge.end_date:
        raise ValueError("Cannot mark day complete outside challenge period")
    
    # Check if today is already completed
    existing_progress = db.query(ChallengeProgress).filter(
        and_(
            ChallengeProgress.user_challenge_id == user_challenge.id,
            ChallengeProgress.completion_date == today
        )
    ).first()
    
    if existing_progress:
        raise ValueError("Today is already marked as complete")
    
    target_stats = user_challenge.challenge.target_stats or []
    total_xp = sum(stat.get('xp', 0) for stat in target_stats)
    
    progress = ChallengeProgress(
        user_challenge_id=user_challenge.id,
        completion_date=today,
        activity_data=activity_data,
        xp_awarded=total_xp
    )
    
    db.add(progress)
    
    for stat in target_stats:
        stat_name = stat.get('stat')
        stat_xp = stat.get('xp', 0)
        if stat_name and stat_xp > 0:
            update_skill_xp(db, user_id, stat_name, stat_xp)
    
    check_challenge_completion(db, user_challenge)
    
    db.commit()
    db.refresh(progress)
    return progress

def check_challenge_completion(db: Session, user_challenge: UserChallenge):
    """
    Check if a challenge should be marked as complete or failed
    """
    if not user_challenge.is_active:
        return
    
    today = datetime.now(timezone.utc).date()
    completed_days = len(user_challenge.progress_entries)
    
    # Check if challenge should be completed
    if completed_days >= user_challenge.challenge.duration_days:
        user_challenge.is_completed = True
        user_challenge.is_active = False
        user_challenge.completion_date = today
        
        # Award completion bonus XP
        if user_challenge.challenge.completion_xp_bonus > 0:
            pass
            # TODO: Award bonus to user's overall level XP (this needs to be adjusted)
        
        award_challenge_badge(db, user_challenge)

def award_challenge_badge(db: Session, user_challenge: UserChallenge):
    """
    Award badge to user upon challenge completion
    """
    if not user_challenge.challenge.badge_id:
        return
    
    # Check if user already has this badge
    existing_badge = db.query(UserBadge).filter(
        and_(
            UserBadge.user_id == user_challenge.user_id,
            UserBadge.badge_id == user_challenge.challenge.badge_id
        )
    ).first()
    
    if existing_badge:
        return  # User already has this badge
    
    user_badge = UserBadge(
        user_id=user_challenge.user_id,
        badge_id=user_challenge.challenge.badge_id,
        user_challenge_id=user_challenge.id
    )
    
    db.add(user_badge)

def get_user_badges(db: Session, user_id: int) -> List[UserBadge]:
    """
    Get all badges earned by a user
    """
    return db.query(UserBadge).filter(UserBadge.user_id == user_id).all()

def get_challenge_with_progress(db: Session, user_id: int) -> Optional[dict]:
    """
    Get user's active challenge with progress information
    Automatically checks for expired challenges first
    """
    user_challenge = get_user_active_challenge(db, user_id)  # This already checks for expired challenges
    if not user_challenge:
        return None
    
    today = datetime.now(timezone.utc).date()
    
    # Calculate progress stats
    current_day = (today - user_challenge.start_date).days + 1 if today >= user_challenge.start_date else 0
    completed_days = len(user_challenge.progress_entries)
    
    # Check if today is already completed
    today_completed = any(
        progress.completion_date == today 
        for progress in user_challenge.progress_entries
    )
    
    return {
        "user_challenge": user_challenge,
        "current_day": min(current_day, user_challenge.challenge.duration_days),
        "completed_days": completed_days,
        "today_completed": today_completed,
        "can_complete_today": (
            current_day > 0 and 
            current_day <= user_challenge.challenge.duration_days and 
            not today_completed
        )
    }