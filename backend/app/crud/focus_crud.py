"""
Click tracking + focus sessions (feature-flagged, private, no XP of its own).

Clicks are always derived, never stored: minutes/60, displayed at 0.25
granularity client-side. For a linked category the habit log's duration is the
canonical daily total (every path adds to it); the read-time rule
max(habit duration, completed focus minutes) keeps focus time as a floor.
"""
import logging
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from ..models.focus_model import FocusCategory, FocusSession, FocusDayNote
from ..models.habit_model import Habit, HabitLog
from ..models.user_model import User
from ..schemas import focus_schema, habit_schema
from ..utils.time import get_user_today, utc_now
from . import habit_crud

logger = logging.getLogger(__name__)

# A half click (30 min) of cumulative focus in a category qualifies its linked
# habit as done for the day. The recorded duration is the actual minutes.
QUALIFY_MINUTES = 30

# Live timers longer than this are treated as forgotten (client prompts a trim).
SUSPECT_LIVE_HOURS = 3

MAX_CAPTURES = 50

DEFAULT_RITUAL = [
    "Phone muted, face-down, out of sight",
    "Desk cleared, keyboard and mouse aligned",
    "Scratch paper and pen at hand",
    "Water within reach",
    "Music on",
    "Distractions handled (pets, door, people)",
]


def _naive_utc_now():
    # DateTime columns are timezone-naive; keep arithmetic consistent.
    return utc_now().replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

def get_categories(db: Session, user_id: int, include_archived: bool = False) -> List[FocusCategory]:
    q = db.query(FocusCategory).filter(FocusCategory.user_id == user_id)
    if not include_archived:
        q = q.filter(FocusCategory.status == "active")
    return q.order_by(FocusCategory.sort_order, FocusCategory.id).all()


def _get_category(db: Session, user_id: int, category_id: int) -> Optional[FocusCategory]:
    return db.query(FocusCategory).filter(
        FocusCategory.id == category_id, FocusCategory.user_id == user_id).first()


def _validate_link(db: Session, user_id: int, habit_id: int, exclude_category_id: int = None):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not habit:
        raise ValueError("Linked habit not found")
    taken = db.query(FocusCategory).filter(FocusCategory.linked_habit_id == habit_id)
    if exclude_category_id:
        taken = taken.filter(FocusCategory.id != exclude_category_id)
    if taken.first():
        raise ValueError("That habit is already linked to another focus category")


def create_category(db: Session, user: User, data: focus_schema.FocusCategoryCreate) -> FocusCategory:
    if data.linked_habit_id:
        _validate_link(db, user.id, data.linked_habit_id)
    duplicate = db.query(FocusCategory).filter(
        FocusCategory.user_id == user.id, FocusCategory.status == "active",
        func.lower(FocusCategory.name) == data.name.strip().lower()).first()
    if duplicate:
        raise ValueError("You already have a focus category with that name")
    max_sort = db.query(func.max(FocusCategory.sort_order)).filter(
        FocusCategory.user_id == user.id).scalar() or 0
    category = FocusCategory(
        user_id=user.id,
        name=data.name.strip(),
        color=data.color,
        icon=data.icon,
        linked_habit_id=data.linked_habit_id,
        sort_order=max_sort + 1,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, user: User, category_id: int,
                    data: focus_schema.FocusCategoryUpdate) -> FocusCategory:
    category = _get_category(db, user.id, category_id)
    if not category:
        raise ValueError("Focus category not found")

    if data.name is not None:
        category.name = data.name.strip()
    if data.color is not None:
        category.color = data.color
    if data.icon is not None:
        category.icon = data.icon
    if data.sort_order is not None:
        category.sort_order = data.sort_order
    if data.status is not None:
        if data.status not in ("active", "archived"):
            raise ValueError("Invalid status")
        category.status = data.status
    # Explicit null unlinks; omitted leaves the link untouched.
    if "linked_habit_id" in data.model_fields_set:
        if data.linked_habit_id:
            _validate_link(db, user.id, data.linked_habit_id, exclude_category_id=category.id)
        category.linked_habit_id = data.linked_habit_id

    db.commit()
    db.refresh(category)
    return category


# ---------------------------------------------------------------------------
# The habit bridge (fires on completed time only, never mid-session)
# ---------------------------------------------------------------------------

def _completed_focus_minutes(db: Session, user_id: int, category_id: int, on_date: date) -> float:
    total = db.query(func.coalesce(func.sum(FocusSession.duration_minutes), 0)).filter(
        FocusSession.user_id == user_id,
        FocusSession.category_id == category_id,
        FocusSession.date == on_date,
        FocusSession.duration_minutes.isnot(None),
    ).scalar()
    return float(total or 0)


def _bridge_minutes_to_habit(db: Session, user: User, category: FocusCategory,
                             minutes_added: float, log_date: date) -> Optional[dict]:
    """
    Additive bridge: an existing habit log gains the minutes (no XP - same as
    re-logging via Today); otherwise >=30 cumulative minutes auto-logs the
    habit with the day's actual focus total. Archived habits still pay XP but
    aren't scheduled, so Today/day-complete are unaffected.
    """
    if not category.linked_habit_id or minutes_added <= 0:
        return None
    habit = db.query(Habit).filter(
        Habit.id == category.linked_habit_id, Habit.user_id == user.id).first()
    if not habit:
        return None

    existing = db.query(HabitLog).filter(
        HabitLog.habit_id == habit.id, HabitLog.date == log_date).first()
    if existing:
        existing.duration_minutes = round((existing.duration_minutes or 0) + minutes_added, 2)
        db.commit()
        return {
            "already_logged": True,
            "habit_id": habit.id,
            "habit_name": habit.name,
            "duration_minutes": existing.duration_minutes,
        }

    total = _completed_focus_minutes(db, user.id, category.id, log_date)
    if total < QUALIFY_MINUTES:
        return None
    try:
        payout = habit_crud.log_habit(
            db, user, habit.id,
            habit_schema.HabitLogCreate(date=log_date, duration_minutes=round(total, 2)),
            allow_archived=True,
        )
        payout["auto_logged"] = True
        return payout
    except ValueError:
        # Outside the habit backfill window etc. - the click time still counts.
        return None


def _unbridge_minutes(db: Session, user: User, category: FocusCategory,
                      minutes_removed: float, log_date: date):
    """Deleting/trimming a session subtracts its minutes; the log and its paid
    rewards stay even if the day drops back under the threshold."""
    if not category.linked_habit_id or minutes_removed <= 0:
        return
    log = db.query(HabitLog).filter(
        HabitLog.habit_id == category.linked_habit_id, HabitLog.date == log_date).first()
    if log and log.duration_minutes:
        log.duration_minutes = max(0, round(log.duration_minutes - minutes_removed, 2))


# ---------------------------------------------------------------------------
# Sessions: live timer + manual entry
# ---------------------------------------------------------------------------

def _session_dict(session: FocusSession) -> dict:
    return {
        "id": session.id,
        "category_id": session.category_id,
        "date": str(session.date),
        # Naive UTC in the DB; the Z suffix keeps client elapsed-time math honest.
        "started_at": session.started_at.isoformat() + "Z" if session.started_at else None,
        "ended_at": session.ended_at.isoformat() + "Z" if session.ended_at else None,
        "duration_minutes": session.duration_minutes,
        "source": session.source,
        "note": session.note,
        "captures": session.captures or [],
    }


def get_active_session(db: Session, user_id: int) -> Optional[FocusSession]:
    return db.query(FocusSession).filter(
        FocusSession.user_id == user_id,
        FocusSession.source == "timer",
        FocusSession.ended_at.is_(None),
        FocusSession.duration_minutes.is_(None),
    ).order_by(FocusSession.id.desc()).first()


def _effective_elapsed_minutes(session: FocusSession, now) -> float:
    """Wall-clock elapsed minus accumulated pauses (including an open one)."""
    if not session.started_at:
        return 0.0
    paused = session.paused_seconds or 0
    if session.pause_started_at:
        paused += max(0, (now - session.pause_started_at).total_seconds())
    return max(0.0, ((now - session.started_at).total_seconds() - paused) / 60)


def _active_payload(db: Session, session: Optional[FocusSession]) -> Optional[dict]:
    if not session:
        return None
    elapsed = _effective_elapsed_minutes(session, _naive_utc_now())
    return {
        **_session_dict(session),
        "elapsed_minutes": round(elapsed, 2),
        "paused": session.pause_started_at is not None,
        "suspect": elapsed > SUSPECT_LIVE_HOURS * 60,
    }


def start_session(db: Session, user: User, category_id: int) -> dict:
    category = _get_category(db, user.id, category_id)
    if not category or category.status != "active":
        raise ValueError("Focus category not found")
    active = get_active_session(db, user.id)
    if active:
        raise ValueError("A focus session is already running - stop or discard it first")

    session = FocusSession(
        user_id=user.id,
        category_id=category.id,
        date=get_user_today(db, user.id),
        started_at=_naive_utc_now(),
        source="timer",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _active_payload(db, session)


def _get_live_session(db: Session, user: User, session_id: int) -> FocusSession:
    session = db.query(FocusSession).filter(
        FocusSession.id == session_id, FocusSession.user_id == user.id).first()
    if not session:
        raise ValueError("Session not found")
    if session.duration_minutes is not None or session.source != "timer":
        raise ValueError("Session is not running")
    return session


def pause_session(db: Session, user: User, session_id: int) -> dict:
    session = _get_live_session(db, user, session_id)
    if session.pause_started_at:
        raise ValueError("Session is already paused")
    session.pause_started_at = _naive_utc_now()
    db.commit()
    db.refresh(session)
    return _active_payload(db, session)


def resume_session(db: Session, user: User, session_id: int) -> dict:
    session = _get_live_session(db, user, session_id)
    if not session.pause_started_at:
        raise ValueError("Session is not paused")
    now = _naive_utc_now()
    session.paused_seconds = (session.paused_seconds or 0) + max(
        0, (now - session.pause_started_at).total_seconds())
    session.pause_started_at = None
    db.commit()
    db.refresh(session)
    return _active_payload(db, session)


def add_capture(db: Session, user: User, session_id: int, text: str) -> dict:
    session = db.query(FocusSession).filter(
        FocusSession.id == session_id, FocusSession.user_id == user.id).first()
    if not session:
        raise ValueError("Session not found")
    captures = list(session.captures or [])
    if len(captures) >= MAX_CAPTURES:
        raise ValueError("Capture pad is full")
    captures.append(text.strip())
    session.captures = captures
    db.commit()
    return {"captures": captures}


def stop_session(db: Session, user: User, session_id: int,
                 payload: focus_schema.FocusSessionStop) -> dict:
    session = _get_live_session(db, user, session_id)

    now = _naive_utc_now()
    # Stopping while paused closes the open pause interval first.
    if session.pause_started_at:
        session.paused_seconds = (session.paused_seconds or 0) + max(
            0, (now - session.pause_started_at).total_seconds())
        session.pause_started_at = None
    elapsed = _effective_elapsed_minutes(session, now)
    duration = payload.duration_minutes if payload.duration_minutes else elapsed
    # Trim-only honesty: the recorded time can never exceed the focused clock.
    duration = round(min(duration, max(elapsed, 0.01)), 2)

    session.ended_at = now
    session.duration_minutes = duration
    if payload.note:
        session.note = payload.note
    if payload.captures is not None:
        session.captures = payload.captures[:MAX_CAPTURES]
    db.commit()
    db.refresh(session)

    category = _get_category(db, user.id, session.category_id)
    habit_payout = _bridge_minutes_to_habit(db, user, category, duration, session.date)

    return {
        "session": _session_dict(session),
        "habit_payout": habit_payout,
        "today_minutes": _day_total_minutes(db, user, session.date),
    }


def discard_session(db: Session, user: User, session_id: int) -> dict:
    """Delete a session. Live: abandoned/false start, no bridge impact.
    Completed: its minutes come back out of the linked habit's duration."""
    session = db.query(FocusSession).filter(
        FocusSession.id == session_id, FocusSession.user_id == user.id).first()
    if not session:
        raise ValueError("Session not found")

    if session.duration_minutes:
        category = _get_category(db, user.id, session.category_id)
        if category:
            _unbridge_minutes(db, user, category, session.duration_minutes, session.date)
    db.delete(session)
    db.commit()
    return {"deleted": True}


def create_manual_session(db: Session, user: User,
                          payload: focus_schema.FocusSessionManual) -> dict:
    category = _get_category(db, user.id, payload.category_id)
    if not category or category.status != "active":
        raise ValueError("Focus category not found")

    user_today = get_user_today(db, user.id)
    log_date = payload.date or user_today
    if log_date > user_today:
        raise ValueError("Cannot log focus time for future dates")

    session = FocusSession(
        user_id=user.id,
        category_id=category.id,
        date=log_date,
        duration_minutes=round(payload.duration_minutes, 2),
        source="manual",
        note=payload.note,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    habit_payout = _bridge_minutes_to_habit(db, user, category, session.duration_minutes, log_date)
    return {
        "session": _session_dict(session),
        "habit_payout": habit_payout,
        "today_minutes": _day_total_minutes(db, user, log_date),
    }


def update_session(db: Session, user: User, session_id: int,
                   payload: focus_schema.FocusSessionUpdate) -> dict:
    session = db.query(FocusSession).filter(
        FocusSession.id == session_id, FocusSession.user_id == user.id).first()
    if not session:
        raise ValueError("Session not found")
    if session.duration_minutes is None:
        raise ValueError("Stop the session before editing it")

    if payload.duration_minutes is not None:
        delta = round(payload.duration_minutes - session.duration_minutes, 2)
        category = _get_category(db, user.id, session.category_id)
        if category and delta != 0:
            if delta > 0:
                _bridge_minutes_to_habit(db, user, category, delta, session.date)
            else:
                _unbridge_minutes(db, user, category, -delta, session.date)
        session.duration_minutes = round(payload.duration_minutes, 2)
    if payload.note is not None:
        session.note = payload.note

    db.commit()
    db.refresh(session)
    return {"session": _session_dict(session)}


def get_sessions_on(db: Session, user: User, on_date: date) -> List[dict]:
    rows = db.query(FocusSession).filter(
        FocusSession.user_id == user.id,
        FocusSession.date == on_date,
        FocusSession.duration_minutes.isnot(None),
    ).order_by(FocusSession.id).all()
    return [_session_dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Click math (derived at read time, never stored)
# ---------------------------------------------------------------------------

def _minutes_by_category_and_date(db: Session, user: User, categories: List[FocusCategory],
                                  start: date, end: date) -> Dict[Tuple[int, date], float]:
    """max(habit-log duration, completed focus minutes) for linked categories;
    focus minutes alone for unlinked ones."""
    focus_rows = db.query(
        FocusSession.category_id, FocusSession.date,
        func.sum(FocusSession.duration_minutes),
    ).filter(
        FocusSession.user_id == user.id,
        FocusSession.date >= start, FocusSession.date <= end,
        FocusSession.duration_minutes.isnot(None),
    ).group_by(FocusSession.category_id, FocusSession.date).all()

    minutes = {(cat_id, d): float(total or 0) for cat_id, d, total in focus_rows}

    habit_to_category = {c.linked_habit_id: c.id for c in categories if c.linked_habit_id}
    if habit_to_category:
        log_rows = db.query(
            HabitLog.habit_id, HabitLog.date, HabitLog.duration_minutes,
        ).filter(
            HabitLog.user_id == user.id,
            HabitLog.habit_id.in_(list(habit_to_category.keys())),
            HabitLog.date >= start, HabitLog.date <= end,
            HabitLog.duration_minutes.isnot(None),
        ).all()
        for habit_id, d, dur in log_rows:
            key = (habit_to_category[habit_id], d)
            minutes[key] = max(minutes.get(key, 0), float(dur or 0))

    return minutes


def _day_total_minutes(db: Session, user: User, on_date: date) -> float:
    categories = get_categories(db, user.id, include_archived=True)
    minutes = _minutes_by_category_and_date(db, user, categories, on_date, on_date)
    return round(sum(minutes.values()), 2)


def _category_out(db: Session, category: FocusCategory) -> dict:
    linked = None
    if category.linked_habit_id:
        habit = db.query(Habit).filter(Habit.id == category.linked_habit_id).first()
        if habit:
            linked = {"id": habit.id, "name": habit.name, "status": habit.status,
                      "detail_kind": habit.bucket.detail_kind if habit.bucket else "none"}
    return {
        "id": category.id,
        "name": category.name,
        "color": category.color,
        "icon": category.icon,
        "sort_order": category.sort_order,
        "status": category.status,
        "linked_habit_id": category.linked_habit_id,
        "linked_habit": linked,
    }


def get_state(db: Session, user: User) -> dict:
    """The light payload: Today strip, Stats landing card, focus tool shell,
    and the DetailSheet's already-focused-today warning."""
    user_today = get_user_today(db, user.id)
    week_start = user_today - timedelta(days=user_today.weekday())  # Monday
    categories = get_categories(db, user.id)

    minutes = _minutes_by_category_and_date(db, user, categories, week_start, user_today)

    today_by_category = {c.id: round(minutes.get((c.id, user_today), 0), 2) for c in categories}
    week_days = []
    cursor = week_start
    while cursor <= user_today:
        week_days.append({
            "date": str(cursor),
            "minutes": round(sum(minutes.get((c.id, cursor), 0) for c in categories), 2),
        })
        cursor += timedelta(days=1)

    return {
        "date": str(user_today),
        "categories": [{**_category_out(db, c), "today_minutes": today_by_category[c.id]}
                       for c in categories],
        "today_minutes": round(sum(today_by_category.values()), 2),
        "week_minutes": round(sum(d["minutes"] for d in week_days), 2),
        "week_days": week_days,
        "active_session": _active_payload(db, get_active_session(db, user.id)),
        "settings": {
            "daily_target_clicks": user.click_daily_target or 2.0,
            "weekly_target_clicks": round((user.click_daily_target or 2.0) * 7, 2),
            "ritual": user.focus_ritual if user.focus_ritual is not None else DEFAULT_RITUAL,
        },
    }


def get_summary(db: Session, user: User, days: int = 105) -> dict:
    """The Clicks page payload: heatmap window, weekly rollups, recent days."""
    user_today = get_user_today(db, user.id)
    start = user_today - timedelta(days=days - 1)
    categories = get_categories(db, user.id, include_archived=True)

    minutes = _minutes_by_category_and_date(db, user, categories, start, user_today)
    notes = {n.date: n.note for n in db.query(FocusDayNote).filter(
        FocusDayNote.user_id == user.id, FocusDayNote.date >= start).all()}

    days_out = []
    cursor = start
    while cursor <= user_today:
        by_category = {c.id: round(minutes.get((c.id, cursor), 0), 2) for c in categories
                       if minutes.get((c.id, cursor), 0) > 0}
        days_out.append({
            "date": str(cursor),
            "minutes": round(sum(by_category.values()), 2),
            "by_category": by_category,
            "note": notes.get(cursor),
        })
        cursor += timedelta(days=1)

    # Weekly rollups, Monday-start (spreadsheet convention).
    weeks_out = []
    week_map = {}
    for entry in days_out:
        d = date.fromisoformat(entry["date"])
        week_start = d - timedelta(days=d.weekday())
        wk = week_map.get(week_start)
        if not wk:
            wk = {"week_start": str(week_start), "minutes": 0, "by_category": {}, "days_elapsed": 0}
            week_map[week_start] = wk
            weeks_out.append(wk)
        wk["minutes"] = round(wk["minutes"] + entry["minutes"], 2)
        wk["days_elapsed"] += 1
        for cat_id, m in entry["by_category"].items():
            wk["by_category"][cat_id] = round(wk["by_category"].get(cat_id, 0) + m, 2)

    return {
        "start": str(start),
        "end": str(user_today),
        "categories": [_category_out(db, c) for c in categories],
        "days": days_out,
        "weeks": weeks_out,
        "today_minutes": _day_total_minutes(db, user, user_today),
        "active_session": _active_payload(db, get_active_session(db, user.id)),
        "settings": {
            "daily_target_clicks": user.click_daily_target or 2.0,
            "weekly_target_clicks": round((user.click_daily_target or 2.0) * 7, 2),
            "ritual": user.focus_ritual if user.focus_ritual is not None else DEFAULT_RITUAL,
        },
    }


# ---------------------------------------------------------------------------
# Day notes + settings
# ---------------------------------------------------------------------------

def upsert_day_note(db: Session, user: User, payload: focus_schema.FocusDayNoteUpsert) -> dict:
    user_today = get_user_today(db, user.id)
    if payload.date > user_today:
        raise ValueError("Cannot add notes for future dates")

    row = db.query(FocusDayNote).filter(
        FocusDayNote.user_id == user.id, FocusDayNote.date == payload.date).first()
    text = payload.note.strip()
    if not text:
        if row:
            db.delete(row)
            db.commit()
        return {"date": str(payload.date), "note": None}
    if row:
        row.note = text
    else:
        db.add(FocusDayNote(user_id=user.id, date=payload.date, note=text))
    db.commit()
    return {"date": str(payload.date), "note": text}


def update_settings(db: Session, user: User, payload: focus_schema.FocusSettingsUpdate) -> dict:
    if payload.click_daily_target is not None:
        user.click_daily_target = payload.click_daily_target
    if payload.ritual is not None:
        user.focus_ritual = [item.strip() for item in payload.ritual if item.strip()][:20]
    db.commit()
    return {
        "daily_target_clicks": user.click_daily_target,
        "weekly_target_clicks": round(user.click_daily_target * 7, 2),
        "ritual": user.focus_ritual if user.focus_ritual is not None else DEFAULT_RITUAL,
    }
