"""
Admin-only routes for system management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..auth.admin_auth import require_admin, require_admin_or_moderator, make_user_admin, revoke_admin_role
from ..dependencies import get_db
from ..models.user_model import User
from ..models.challenge_model import UserChallenge
from ..schemas.user_schema import User as UserSchema
from ..schemas.challenge_schema import Challenge as ChallengeSchema
from ..crud import admin_crud

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserSchema])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    _admin_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get all users (admin/moderator only)"""
    users = admin_crud.get_all_users(db, skip=skip, limit=limit)
    return users


@router.post("/users/{user_id}/make-admin")
async def grant_admin_role(
    user_id: int,
    _admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Grant admin role to a user (admin only)"""
    user = await make_user_admin(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"User {user.username} granted admin role"}


@router.post("/users/{user_id}/revoke-admin")
async def revoke_admin_role_endpoint(
    user_id: int,
    _admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Revoke admin role from a user (admin only)"""
    user = await revoke_admin_role(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Admin role revoked from user {user.username}"}


@router.get("/challenges", response_model=List[ChallengeSchema])
async def get_all_challenges_admin(
    _admin_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get all challenges including inactive ones (admin/moderator only)"""
    challenges = admin_crud.get_all_challenges(db, include_inactive=True)
    return challenges


@router.post("/challenges/{challenge_id}/toggle-active")
async def toggle_challenge_active(
    challenge_id: int,
    _admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Toggle challenge active status (admin only)"""
    try:
        challenge = admin_crud.toggle_challenge_active_status(db, challenge_id)
        status_text = "activated" if challenge.is_active else "deactivated"
        return {"message": f"Challenge '{challenge.title}' {status_text}"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/users/{user_id}/complete-challenge-day")
async def admin_complete_challenge_day(
    user_id: int,
    _admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manually complete a challenge day for a user (admin only)"""
    # Get user's active challenge
    user_challenge = db.query(UserChallenge).filter(
        UserChallenge.user_id == user_id,
        UserChallenge.is_completed == False
    ).first()
    
    if not user_challenge:
        raise HTTPException(status_code=404, detail="User has no active challenge")
    
    # Import here to avoid circular imports
    from ..crud.challenge_crud import complete_challenge_day
    
    try:
        progress_entry = await complete_challenge_day(user_challenge.id, db)
        return {
            "message": f"Challenge day completed for user {user_id}",
            "progress_entry": progress_entry
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats")
async def get_admin_stats(
    _admin_user: User = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db)
):
    """Get system statistics (admin/moderator only)"""
    return admin_crud.get_system_stats(db)