from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ..models import user_model
from ..schemas import challenge_schema
from ..crud import challenge_crud
from ..auth import auth_utils
from ..dependencies import get_db

router = APIRouter(prefix="/challenges", tags=["challenges"])

@router.get("/available", response_model=challenge_schema.ChallengeLibraryResponse)
async def get_available_challenges(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Get all available challenges that users can join
    """
    try:
        challenges = challenge_crud.get_available_challenges(db)
        return challenge_schema.ChallengeLibraryResponse(challenges=challenges)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch challenges: {str(e)}"
        )

@router.post("/join", response_model=challenge_schema.UserChallenge)
async def join_challenge(
    request: challenge_schema.ChallengeJoinRequest,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Join a challenge. Only one active challenge per user is allowed.
    """
    try:
        user_challenge = challenge_crud.join_challenge(
            db, 
            user_id=current_user.id, 
            challenge_id=request.challenge_id
        )
        return user_challenge
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join challenge: {str(e)}"
        )

@router.get("/active", response_model=challenge_schema.ActiveChallengeResponse)
async def get_active_challenge(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Get user's currently active challenge with progress information
    """
    try:
        challenge_data = challenge_crud.get_challenge_with_progress(db, current_user.id)
        return challenge_schema.ActiveChallengeResponse(active_challenge=challenge_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch active challenge: {str(e)}"
        )

@router.post("/complete")
async def mark_day_complete(
    request: challenge_schema.MarkCompleteRequest,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Mark today as complete for the user's active challenge
    """
    try:
        progress = challenge_crud.mark_day_complete(
            db,
            user_id=current_user.id,
            activity_data=request.activity_data
        )
        
        # Get the user challenge to check completion status
        # After mark_day_complete, if the challenge was completed, it will have is_active=False and is_completed=True
        from ..models.challenge_model import UserChallenge
        user_challenge = db.query(UserChallenge).filter(
            UserChallenge.user_id == current_user.id,
            UserChallenge.id == progress.user_challenge_id
        ).first()
        
        challenge_completed = user_challenge.is_completed if user_challenge else False
        
        # Get the updated challenge data (might be None if challenge is completed)
        updated_challenge_data = challenge_crud.get_challenge_with_progress(db, current_user.id)
        
        return {
            "progress": progress,
            "challenge_completed": challenge_completed,
            "challenge_data": updated_challenge_data
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark day complete: {str(e)}"
        )

@router.post("/quit")
async def quit_challenge(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Quit the user's active challenge
    """
    try:
        user_challenge = challenge_crud.quit_challenge(db, current_user.id)
        if not user_challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active challenge found"
            )
        return {"message": "Challenge quit successfully", "challenge_id": user_challenge.challenge_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to quit challenge: {str(e)}"
        )

@router.get("/history", response_model=challenge_schema.ChallengeHistoryResponse)
async def get_challenge_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Get user's challenge history (completed, failed, or quit challenges)
    """
    try:
        challenges = challenge_crud.get_user_challenge_history(db, current_user.id, skip, limit)
        # Get total count for pagination
        total = len(challenge_crud.get_user_challenge_history(db, current_user.id, 0, 1000))  # Simple approach for now
        
        return challenge_schema.ChallengeHistoryResponse(
            challenges=challenges,
            total=total
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch challenge history: {str(e)}"
        )

@router.get("/badges", response_model=challenge_schema.UserBadgesResponse)
async def get_user_badges(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Get all badges earned by the user
    """
    try:
        badges = challenge_crud.get_user_badges(db, current_user.id)
        return challenge_schema.UserBadgesResponse(badges=badges)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user badges: {str(e)}"
        )

# Admin endpoints (for seeding challenges, managing badges, etc.)
@router.get("/{challenge_id}", response_model=challenge_schema.Challenge)
async def get_challenge_by_id(
    challenge_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user)
):
    """
    Get a specific challenge by ID
    """
    try:
        challenge = challenge_crud.get_challenge_by_id(db, challenge_id)
        if not challenge:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found"
            )
        return challenge
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch challenge: {str(e)}"
        )