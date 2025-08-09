from datetime import datetime, timezone

def utc_now():
    """Returns the current UTC datetime"""
    return datetime.now(timezone.utc)

def utc_today():
    """Returns the current UTC date"""
    return datetime.now(timezone.utc).date()