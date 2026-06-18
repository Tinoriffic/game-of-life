import logging
from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..models import user_model
from ..schemas import habit_schema
from ..crud import habit_crud
from ..auth import auth_utils
from ..dependencies import get_db

router = APIRouter(tags=["habits"])
logger = logging.getLogger(__name__)


def _bad_request(e: ValueError):
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- Buckets & library -------------------------------------------------------

@router.get("/buckets", response_model=List[habit_schema.BucketOut])
async def get_buckets(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    """The fixed bucket taxonomy + curated habit library."""
    return habit_crud.get_buckets(db)


# --- Today (the daily loop) --------------------------------------------------

@router.get("/today")
async def get_today(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    """Everything the Today view needs in one call."""
    return habit_crud.get_today(db, current_user)


# --- Habit CRUD ---------------------------------------------------------------

@router.get("/habits", response_model=List[habit_schema.HabitOut])
async def list_habits(
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    return habit_crud.get_user_habits(db, current_user.id, include_archived=include_archived)


@router.get("/habits/slots")
async def get_slots(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    return habit_crud.slot_state(db, current_user)


@router.get("/habits/heatmap")
async def get_heatmap(
    days: int = Query(182, ge=7, le=400),
    habit_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    return habit_crud.get_heatmap(db, current_user, days=days, habit_id=habit_id)


@router.get("/habits/stats-overview")
async def get_stats_overview(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    return habit_crud.get_stats_overview(db, current_user)


@router.post("/habits", response_model=habit_schema.HabitOut, status_code=status.HTTP_201_CREATED)
async def create_habit(
    data: habit_schema.HabitCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        return habit_crud.create_habit(db, current_user, data)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/habits/reorder", response_model=List[habit_schema.HabitOut])
async def reorder_habits(
    payload: habit_schema.HabitReorder,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    return habit_crud.reorder_habits(db, current_user, payload.ordered_ids)


@router.patch("/habits/{habit_id}", response_model=habit_schema.HabitOut)
async def update_habit(
    habit_id: int,
    data: habit_schema.HabitUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        return habit_crud.update_habit(db, current_user, habit_id, data)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/habits/{habit_id}/archive", response_model=habit_schema.HabitOut)
async def archive_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        return habit_crud.archive_habit(db, current_user, habit_id)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/habits/{habit_id}/restore", response_model=habit_schema.HabitOut)
async def restore_habit(
    habit_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        return habit_crud.restore_habit(db, current_user, habit_id)
    except ValueError as e:
        raise _bad_request(e)


# --- Logging -------------------------------------------------------------------

@router.post("/habits/{habit_id}/logs")
async def log_habit(
    habit_id: int,
    payload: habit_schema.HabitLogCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    """
    The one-tap action. Returns the full payout breakdown so the feedback
    layer can fire toasts/celebrations without a second request.
    """
    try:
        return habit_crud.log_habit(db, current_user, habit_id, payload)
    except ValueError as e:
        raise _bad_request(e)


@router.patch("/habits/{habit_id}/logs/{log_date}")
async def update_log(
    habit_id: int,
    log_date: date,
    payload: habit_schema.HabitLogUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        return habit_crud.update_log(db, current_user, habit_id, log_date, payload)
    except ValueError as e:
        raise _bad_request(e)


@router.delete("/habits/{habit_id}/logs/{log_date}")
async def delete_log(
    habit_id: int,
    log_date: date,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        return habit_crud.delete_log(db, current_user, habit_id, log_date)
    except ValueError as e:
        raise _bad_request(e)
