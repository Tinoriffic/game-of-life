from datetime import datetime, timezone, date, timedelta
import pytz
from sqlalchemy.orm import Session
from typing import Optional

def utc_now():
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)

def utc_today():
    """Return the current UTC date."""
    return datetime.now(timezone.utc).date()

def get_user_date(user_timezone: str = 'UTC') -> date:
    """Get current date in user's timezone. Ensures operations use user's calendar day, not UTC."""
    try:
        tz = pytz.timezone(user_timezone)
        return datetime.now(tz).date()
    except Exception:
        # Fallback to UTC timezone
        return datetime.now(pytz.UTC).date()

def get_user_timezone_from_db(db: Session, user_id: int) -> str:
    """Get user's timezone from database, defaulting to 'UTC'."""
    from ..models.user_model import User  # Import here to avoid circular imports
    user = db.query(User).filter(User.id == user_id).first()
    return user.timezone if user and user.timezone else 'UTC'

def get_user_today(db: Session, user_id: int) -> date:
    """Get today's date in user's timezone."""
    user_timezone = get_user_timezone_from_db(db, user_id)
    return get_user_date(user_timezone)

def get_user_yesterday(db: Session, user_id: int) -> date:
    """Get yesterday's date in user's timezone. Used for historical activity logging."""
    user_today = get_user_today(db, user_id)
    return user_today - timedelta(days=1)

def validate_activity_date(
    db: Session,
    user_id: int,
    activity_date: Optional[date],
    is_admin: bool = False
) -> tuple[bool, str, date]:
    """
    Validate if a user can log an activity for the given date.

    Rules:
    - If activity_date is None, use today (always valid)
    - Regular users: today or yesterday (if feature enabled)
    - Admin users: any past date
    - Nobody: future dates

    Returns (is_valid, error_message, validated_date):
    - is_valid: True if the date is allowed
    - error_message: Empty if valid, error description if not
    - validated_date: The date to use (today if None was passed)
    """
    from ..crud import system_settings_crud

    user_today = get_user_today(db, user_id)

    # If no date provided, use today (always valid)
    if activity_date is None:
        return (True, "", user_today)

    # Future dates are never allowed
    if activity_date > user_today:
        return (False, "Cannot log activities for future dates", activity_date)

    # Today is always allowed
    if activity_date == user_today:
        return (True, "", activity_date)

    # Admin users can log any past date
    if is_admin:
        return (True, "", activity_date)

    # For regular users, check if previous day logging is enabled
    user_yesterday = get_user_yesterday(db, user_id)

    if activity_date == user_yesterday:
        # Check if feature flag allows previous day logging
        if system_settings_crud.is_previous_day_logging_enabled(db):
            return (True, "", activity_date)
        else:
            return (False, "Previous day logging is not currently enabled", activity_date)

    # Any other past date is not allowed for regular users
    return (False, "Regular users can only log activities for today or yesterday", activity_date)

def is_within_grace_period(failed_date: Optional[date], user_today: date) -> bool:
    """
    Check if a failed challenge is still within the 24-hour grace period.
    Grace period allows users to restore by logging the missed activity within 24 hours.
    Returns True if failed yesterday.
    """
    if not failed_date:
        return False

    days_since_failure = (user_today - failed_date).days
    return days_since_failure == 1  # Failed yesterday, viewing today