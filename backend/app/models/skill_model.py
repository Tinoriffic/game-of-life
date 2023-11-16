from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship

from ..database import Base
from datetime import datetime

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    daily_xp_earned = Column(Integer, default=0)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_skill_id = Column(Integer, ForeignKey("skills.id"))
    
    user = relationship("User", back_populates="skills")

class SkillProgression(Base):
    __tablename__ = "skill_progression"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_name = Column(String, index=True)
    xp = Column(Integer)
    level = Column(Integer)
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="skill_progression")