from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from ..database import Base
from ..utils.time import utc_now

class SystemSettings(Base):
    """
    Global system settings that apply to all users.
    These can be toggled via admin panel to enable/disable features.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    setting_key = Column(String, unique=True, nullable=False, index=True)
    setting_value = Column(String, nullable=False)  # Store as string, parse as needed
    description = Column(String, nullable=True)  # Human-readable description for admin UI
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    updated_by = Column(Integer, nullable=True)  # Admin user who last updated

    def get_boolean_value(self) -> bool:
        """Parse setting_value as boolean"""
        return self.setting_value.lower() in ('true', '1', 'yes', 'on')

    def get_int_value(self) -> int:
        """Parse setting_value as integer"""
        try:
            return int(self.setting_value)
        except ValueError:
            return 0

    def __repr__(self):
        return f"<SystemSettings(key='{self.setting_key}', value='{self.setting_value}')>"
