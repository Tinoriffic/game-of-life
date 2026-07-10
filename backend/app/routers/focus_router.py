"""
Click tracking + focus sessions. Every route is gated on the per-user
click_tracking feature flag - the feature is private and off by default.
"""
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..models import user_model
from ..schemas import focus_schema
from ..crud import focus_crud
from ..auth import auth_utils
from ..dependencies import get_db

router = APIRouter(prefix="/focus", tags=["focus"])
logger = logging.getLogger(__name__)

CLICK_TRACKING_FLAG = "click_tracking"


def require_click_tracking(
    current_user: user_model.User = Depends(auth_utils.get_current_user),
) -> user_model.User:
    if not (current_user.feature_flags or {}).get(CLICK_TRACKING_FLAG):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Click tracking is not enabled for this account")
    return current_user


def _bad_request(e: ValueError):
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- State & summary -----------------------------------------------------------

@router.get("/state")
async def get_state(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    """Light payload for the Today strip, Stats card, and the focus tool shell."""
    return focus_crud.get_state(db, current_user)


@router.get("/summary")
async def get_summary(
    days: int = Query(105, ge=7, le=400),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    """The Clicks page payload: day series, weekly rollups, notes."""
    return focus_crud.get_summary(db, current_user, days=days)


# --- Categories -----------------------------------------------------------------

@router.get("/categories")
async def list_categories(
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    return [focus_crud._category_out(db, c)
            for c in focus_crud.get_categories(db, current_user.id, include_archived)]


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    data: focus_schema.FocusCategoryCreate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        category = focus_crud.create_category(db, current_user, data)
        return focus_crud._category_out(db, category)
    except ValueError as e:
        raise _bad_request(e)


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: int,
    data: focus_schema.FocusCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        category = focus_crud.update_category(db, current_user, category_id, data)
        return focus_crud._category_out(db, category)
    except ValueError as e:
        raise _bad_request(e)


# --- Sessions ---------------------------------------------------------------------

@router.get("/active")
async def get_active(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    return {"active_session": focus_crud._active_payload(
        db, focus_crud.get_active_session(db, current_user.id))}


@router.post("/sessions/start")
async def start_session(
    payload: focus_schema.FocusSessionStart,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        return focus_crud.start_session(db, current_user, payload.category_id)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/sessions/{session_id}/pause")
async def pause_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    """Interrupted? Paused time is excluded from the focused clock."""
    try:
        return focus_crud.pause_session(db, current_user, session_id)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/sessions/{session_id}/resume")
async def resume_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        return focus_crud.resume_session(db, current_user, session_id)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/sessions/{session_id}/capture")
async def add_capture(
    session_id: int,
    payload: focus_schema.CaptureAdd,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        return focus_crud.add_capture(db, current_user, session_id, payload.text)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/sessions/{session_id}/stop")
async def stop_session(
    session_id: int,
    payload: focus_schema.FocusSessionStop,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    """Ends the timer; the habit bridge fires here (never mid-session)."""
    try:
        return focus_crud.stop_session(db, current_user, session_id, payload)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def create_manual_session(
    payload: focus_schema.FocusSessionManual,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    """Manual entry: already did the work, know the duration - no timer needed."""
    try:
        return focus_crud.create_manual_session(db, current_user, payload)
    except ValueError as e:
        raise _bad_request(e)


@router.get("/sessions")
async def list_sessions(
    on_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    return {"sessions": focus_crud.get_sessions_on(db, current_user, on_date)}


@router.patch("/sessions/{session_id}")
async def update_session(
    session_id: int,
    payload: focus_schema.FocusSessionUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        return focus_crud.update_session(db, current_user, session_id, payload)
    except ValueError as e:
        raise _bad_request(e)


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        return focus_crud.discard_session(db, current_user, session_id)
    except ValueError as e:
        raise _bad_request(e)


# --- Day notes & settings ------------------------------------------------------------

@router.put("/day-note")
async def upsert_day_note(
    payload: focus_schema.FocusDayNoteUpsert,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    try:
        return focus_crud.upsert_day_note(db, current_user, payload)
    except ValueError as e:
        raise _bad_request(e)


@router.patch("/settings")
async def update_settings(
    payload: focus_schema.FocusSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(require_click_tracking),
):
    return focus_crud.update_settings(db, current_user, payload)
