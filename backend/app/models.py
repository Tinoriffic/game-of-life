from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship

from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    skills = relationship("Skill", back_populates="owner")

class Skill(Base):
    __tablename__ = "skills"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"))
    parent_skill_id = Column(Integer, ForeignKey("skills.id"))
    
    owner = relationship("User", back_populates="skills")

class UserActivities(Base):
    __tablename__ = "user_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    activity_type = Column(String, index=True)
    description = Column(String)
    xp_earned = Column(Integer)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="activities")

class SkillProgression(Base):
    __tablename__ = "skill_progression"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    skill_name = Column(String, index=True)
    xp = Column(Integer)
    level = Column(Integer)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User", back_populates="skills")