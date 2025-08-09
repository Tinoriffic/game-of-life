from sqlalchemy import Column, ForeignKey, Integer, String, Float, DateTime, Boolean, Date, JSON, Text
from sqlalchemy.orm import relationship

from ..database import Base
from ..utils.time import utc_today, utc_now

class Badge(Base):
    __tablename__ = "badges"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    icon_url = Column(String, nullable=True)
    
    challenges = relationship("Challenge", back_populates="badge")
    user_badges = relationship("UserBadge", back_populates="badge")

class Challenge(Base):
    __tablename__ = "challenges"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    duration_days = Column(Integer)
    target_stats = Column(JSON)  # [{"stat": "Stamina", "xp": 5}, {"stat": "Strength", "xp": 3}]
    completion_xp_bonus = Column(Integer, default=0)  # Bonus XP for completing entire challenge
    badge_id = Column(Integer, ForeignKey('badges.id'), nullable=True)
    activity_type = Column(String, nullable=True)  # Links to existing activity types or null for simple completion
    validation_rules = Column(JSON, nullable=True)  # Flexible validation rules for the future
    icon = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)  # Allow disabling challenges
    
    badge = relationship("Badge", back_populates="challenges")
    user_challenges = relationship("UserChallenge", back_populates="challenge")

class UserChallenge(Base):
    __tablename__ = "user_challenges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    challenge_id = Column(Integer, ForeignKey('challenges.id'))
    start_date = Column(Date, default=utc_today)
    end_date = Column(Date)  # Computed: start_date + duration_days
    is_active = Column(Boolean, default=True)
    is_completed = Column(Boolean, default=False)
    is_failed = Column(Boolean, default=False)
    quit_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    
    user = relationship('User', back_populates='user_challenges')
    challenge = relationship("Challenge", back_populates="user_challenges")
    progress_entries = relationship("ChallengeProgress", back_populates="user_challenge", cascade="all, delete-orphan")
    
    @property
    def current_day(self):
        """Calculate which day of the challenge we're on"""
        if not self.is_active:
            return 0
        today = utc_today()
        if today < self.start_date:
            return 0
        elif today > self.end_date:
            return self.challenge.duration_days
        else:
            return (today - self.start_date).days + 1
    
    @property
    def completed_days(self):
        """Count of successfully completed days"""
        return len(self.progress_entries)
    
    @property
    def current_streak(self):
        """Calculate current consecutive streak"""
        if not self.progress_entries:
            return 0
        
        sorted_entries = sorted(self.progress_entries, key=lambda x: x.completion_date, reverse=True)
        streak = 0
        expected_date = utc_today()
        
        for entry in sorted_entries:
            if entry.completion_date == expected_date or entry.completion_date == expected_date - timedelta(days=1):
                streak += 1
                expected_date = entry.completion_date - timedelta(days=1)
            else:
                break
                
        return streak

class ChallengeProgress(Base):
    __tablename__ = "challenge_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_challenge_id = Column(Integer, ForeignKey('user_challenges.id', ondelete='CASCADE'))
    completion_date = Column(Date, default=utc_today)
    activity_data = Column(JSON, nullable=True)  # Store activity-specific data (distance, duration, etc.)
    xp_awarded = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)
    
    user_challenge = relationship("UserChallenge", back_populates="progress_entries")

class UserBadge(Base):
    __tablename__ = "user_badges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    badge_id = Column(Integer, ForeignKey('badges.id'))
    earned_date = Column(DateTime, default=datetime.utcnow)
    user_challenge_id = Column(Integer, ForeignKey('user_challenges.id'), nullable=True)  # Track which challenge earned this badge
    
    user = relationship('User', back_populates='user_badges')
    badge = relationship("Badge", back_populates="user_badges")
    user_challenge = relationship("UserChallenge")