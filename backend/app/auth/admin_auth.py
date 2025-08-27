"""
Admin authentication and authorization utilities
"""
from functools import wraps
from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session
from ..auth import auth_utils
from ..models.user_model import User, UserRole
from ..crud.user_crud import get_user


def require_admin(current_user: User = Depends(auth_utils.get_current_user)):
    """
    Dependency to require admin role
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_admin_or_moderator(current_user: User = Depends(auth_utils.get_current_user)):
    """
    Dependency to require admin or moderator role
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.MODERATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or moderator access required"
        )
    return current_user


async def make_user_admin(user_id: int, db: Session):
    """
    Utility function to grant admin role to a user
    """
    user = get_user(db, user_id)
    if not user:
        return None
    
    user.role = UserRole.ADMIN
    db.commit()
    db.refresh(user)
    return user


async def revoke_admin_role(user_id: int, db: Session):
    """
    Utility function to revoke admin role from a user
    """
    user = get_user(db, user_id)
    if not user:
        return None
    
    user.role = UserRole.USER
    db.commit()
    db.refresh(user)
    return user