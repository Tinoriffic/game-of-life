from datetime import datetime, timezone, date
import pytz
from sqlalchemy.orm import Session

def utc_now():
    """Returns the current UTC datetime"""
    return datetime.now(timezone.utc)

def utc_today():
    """Returns the current UTC date"""
    return datetime.now(timezone.utc).date()

def get_user_date(user_timezone: str = 'UTC') -> date:
    """
    Get current date in user's timezone.
    This ensures operations are based on the user's calendar day, not UTC day.
    """
    try:
        tz = pytz.timezone(user_timezone)
        return datetime.now(tz).date()
    except Exception:
        # Fallback to UTC timezone
        return datetime.now(pytz.UTC).date()

def get_user_timezone_from_db(db: Session, user_id: int) -> str:
    """
    Get user's timezone from database, defaulting to UTC
    """
    from ..models.user_model import User  # Import here to avoid circular imports
    user = db.query(User).filter(User.id == user_id).first()
    return user.timezone if user and user.timezone else 'UTC'

def get_user_today(db: Session, user_id: int) -> date:
    """
    Convenience function to get today's date in user's timezone.
    Combines timezone lookup + date calculation in one call.
    """
    user_timezone = get_user_timezone_from_db(db, user_id)
    return get_user_date(user_timezone)