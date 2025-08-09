from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date, datetime

class BadgeBase(BaseModel):
    title: str
    description: Optional[str] = None
    icon_url: Optional[str] = None

class Badge(BadgeBase):
    id: int
    
    class Config:
        from_attributes = True

class ChallengeBase(BaseModel):
    title: str
    description: str
    duration_days: int
    target_stats: List[Dict[str, Any]]  # [{"stat": "Stamina", "xp": 5}]
    completion_xp_bonus: Optional[int] = 0
    activity_type: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None
    icon: Optional[str] = None

class ChallengeCreate(ChallengeBase):
    badge_id: Optional[int] = None
    is_active: Optional[bool] = True

class Challenge(ChallengeBase):
    id: int
    badge_id: Optional[int] = None
    is_active: bool
    badge: Optional[Badge] = None
    
    class Config:
        from_attributes = True

class ChallengeProgressBase(BaseModel):
    activity_data: Optional[Dict[str, Any]] = None

class ChallengeProgressCreate(ChallengeProgressBase):
    pass

class ChallengeProgress(ChallengeProgressBase):
    id: int
    user_challenge_id: int
    completion_date: date
    xp_awarded: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserChallengeBase(BaseModel):
    challenge_id: int

class UserChallengeCreate(UserChallengeBase):
    pass

class UserChallenge(UserChallengeBase):
    id: int
    user_id: int
    start_date: date
    end_date: date
    is_active: bool
    is_completed: bool
    is_failed: bool
    quit_date: Optional[date] = None
    completion_date: Optional[date] = None
    challenge: Challenge
    progress_entries: List[ChallengeProgress] = []
    
    class Config:
        from_attributes = True

class UserChallengeWithProgress(BaseModel):
    user_challenge: UserChallenge
    current_day: int
    completed_days: int
    today_completed: bool
    can_complete_today: bool

class UserBadgeBase(BaseModel):
    badge_id: int

class UserBadge(UserBadgeBase):
    id: int
    user_id: int
    earned_date: datetime
    user_challenge_id: Optional[int] = None
    badge: Badge
    
    class Config:
        from_attributes = True

class ChallengeJoinRequest(BaseModel):
    challenge_id: int

class MarkCompleteRequest(BaseModel):
    activity_data: Optional[Dict[str, Any]] = None

# Response schemas for API endpoints
class ChallengeLibraryResponse(BaseModel):
    challenges: List[Challenge]

class ActiveChallengeResponse(BaseModel):
    active_challenge: Optional[UserChallengeWithProgress] = None

class UserBadgesResponse(BaseModel):
    badges: List[UserBadge]

class ChallengeHistoryResponse(BaseModel):
    challenges: List[UserChallenge]
    total: int