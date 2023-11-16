from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..schemas import skill_schema
from ..crud import skill_crud, user_crud
from ..dependencies import get_db
from typing import List

router = APIRouter()

# Skill Endpoints

# Gets the user's skills
@router.get("/users/{user_id}/skills/", response_model=List[skill_schema.Skill])
def get_user_skills(user_id: int, db: Session = Depends(get_db)):
    if not user_crud.get_user(db, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return skill_crud.get_user_skills(db, user_id)