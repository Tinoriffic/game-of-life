"""
CRUD operations for system settings.
"""
from sqlalchemy.orm import Session
from typing import Optional
from app.models.system_settings_model import SystemSettings


def get_setting(db: Session, setting_key: str) -> Optional[SystemSettings]:
    """Get a system setting by key. Returns None if not found."""
    return db.query(SystemSettings).filter(
        SystemSettings.setting_key == setting_key
    ).first()


def get_setting_value(db: Session, setting_key: str, default: str = "false") -> str:
    """Get the value of a system setting as a string."""
    setting = get_setting(db, setting_key)
    return setting.setting_value if setting else default


def get_boolean_setting(db: Session, setting_key: str, default: bool = False) -> bool:
    """Get a system setting parsed as a boolean."""
    setting = get_setting(db, setting_key)
    if setting:
        return setting.get_boolean_value()
    return default


def get_int_setting(db: Session, setting_key: str, default: int = 0) -> int:
    """Get a system setting parsed as an integer."""
    setting = get_setting(db, setting_key)
    if setting:
        return setting.get_int_value()
    return default


def update_setting(
    db: Session,
    setting_key: str,
    setting_value: str,
    admin_user_id: Optional[int] = None
) -> SystemSettings:
    """Update a system setting value."""
    setting = get_setting(db, setting_key)
    if setting:
        setting.setting_value = setting_value
        setting.updated_by = admin_user_id
        db.commit()
        db.refresh(setting)
    return setting


def is_challenge_grace_period_enabled(db: Session) -> bool:
    """Check if users can restore failed challenges within 24 hours."""
    return get_boolean_setting(db, 'allow_challenge_grace_period', default=False)


def is_previous_day_logging_enabled(db: Session) -> bool:
    """Check if users can log activities for yesterday."""
    return get_boolean_setting(db, 'allow_previous_day_logging', default=False)
