"""
Habit CRUD + the daily-loop engine: logging, streaks, day-complete state,
two-track XP payouts, 48h backfill window, challenge auto-progress.
"""
import logging
from datetime import datetime, date, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from ..models.habit_model import Bucket, HabitTemplate, Habit, HabitLog, DayCompletion, PlayerXPEvent
from ..models.user_model import User
from ..models.skill_model import Skill
from ..models import activity_model
from ..schemas import habit_schema
from ..utils.time import get_user_today, utc_now
from .. import xp_engine, habit_logic

logger = logging.getLogger(__name__)

BACKFILL_WINDOW_DAYS = 2   # 48h edit window: today, yesterday, the day before
MAX_MEASUREMENT_HABITS = 3

VALID_CADENCES = {habit_logic.CADENCE_DAILY, habit_logic.CADENCE_WEEKLY, habit_logic.CADENCE_WEEKDAYS}


# ---------------------------------------------------------------------------
# Buckets & library
# ---------------------------------------------------------------------------

def get_buckets(db: Session) -> List[Bucket]:
    return (
        db.query(Bucket)
        .filter(Bucket.is_active == True)  # noqa: E712
        .options(joinedload(Bucket.templates))
        .order_by(Bucket.sort_order)
        .all()
    )


# ---------------------------------------------------------------------------
# Habit CRUD + slots
# ---------------------------------------------------------------------------

def get_user_habits(db: Session, user_id: int, include_archived: bool = False) -> List[Habit]:
    query = db.query(Habit).filter(Habit.user_id == user_id).options(joinedload(Habit.bucket))
    if not include_archived:
        query = query.filter(Habit.status == "active")
    return query.order_by(Habit.sort_order, Habit.id).all()


def get_user_habit(db: Session, user_id: int, habit_id: int) -> Optional[Habit]:
    return (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == user_id)
        .options(joinedload(Habit.bucket))
        .first()
    )


def slot_state(db: Session, user: User) -> dict:
    level = xp_engine.player_level_from_xp(user.player_xp)["level"]
    total = xp_engine.slots_for_level(level)
    used = (
        db.query(func.count(Habit.id))
        .filter(Habit.user_id == user.id, Habit.status == "active", Habit.habit_type == "standard")
        .scalar()
    ) or 0
    return {"total": total, "used": used, "available": max(0, total - used)}


def _validate_cadence(cadence_type: str, times_per_week, weekdays):
    if cadence_type not in VALID_CADENCES:
        raise ValueError(f"Invalid cadence type '{cadence_type}'")
    if cadence_type == habit_logic.CADENCE_WEEKLY and not times_per_week:
        raise ValueError("Weekly habits need a times-per-week target")
    if cadence_type == habit_logic.CADENCE_WEEKDAYS:
        if not weekdays or not all(isinstance(d, int) and 0 <= d <= 6 for d in weekdays):
            raise ValueError("Weekday habits need at least one weekday (0=Mon .. 6=Sun)")


def create_habit(db: Session, user: User, data: habit_schema.HabitCreate) -> Habit:
    bucket = db.query(Bucket).filter(Bucket.id == data.bucket_id, Bucket.is_active == True).first()  # noqa: E712
    if not bucket:
        raise ValueError("Bucket not found")

    habit_type = data.habit_type
    measurement_kind = data.measurement_kind
    measurement_unit = data.measurement_unit

    # Creating from a library template inherits its measurement shape.
    if data.template_id:
        template = db.query(HabitTemplate).filter(HabitTemplate.id == data.template_id).first()
        if template and template.measurement_kind:
            habit_type = "measurement"
            measurement_kind = measurement_kind or template.measurement_kind
            measurement_unit = measurement_unit or template.measurement_unit

    if bucket.key == "measurement":
        habit_type = "measurement"

    _validate_cadence(data.cadence_type, data.times_per_week, data.weekdays)

    # Focus over hoarding: standard habits consume limited active slots.
    if habit_type == "standard":
        slots = slot_state(db, user)
        if slots["available"] <= 0:
            raise ValueError(
                f"All {slots['total']} habit slots are in use. "
                "Archive a habit to free a slot, or level up to earn more room."
            )
    else:
        active_measurements = (
            db.query(func.count(Habit.id))
            .filter(Habit.user_id == user.id, Habit.status == "active", Habit.habit_type == "measurement")
            .scalar()
        ) or 0
        if active_measurements >= MAX_MEASUREMENT_HABITS:
            raise ValueError(f"Maximum of {MAX_MEASUREMENT_HABITS} measurement habits at once")

    duplicate = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.status == "active",
                func.lower(Habit.name) == data.name.strip().lower())
        .first()
    )
    if duplicate:
        raise ValueError("You already have an active habit with that name")

    max_sort = db.query(func.max(Habit.sort_order)).filter(Habit.user_id == user.id).scalar() or 0
    habit = Habit(
        user_id=user.id,
        bucket_id=bucket.id,
        name=data.name.strip(),
        icon=data.icon or bucket.icon,
        habit_type=habit_type,
        measurement_kind=measurement_kind,
        measurement_unit=measurement_unit,
        cadence_type=data.cadence_type,
        times_per_week=data.times_per_week if data.cadence_type == habit_logic.CADENCE_WEEKLY else None,
        weekdays=data.weekdays if data.cadence_type == habit_logic.CADENCE_WEEKDAYS else None,
        status="active",
        sort_order=max_sort + 1,
        program_id=data.program_id,
        target_value=data.target_value,
    )
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def update_habit(db: Session, user: User, habit_id: int, data: habit_schema.HabitUpdate) -> Habit:
    habit = get_user_habit(db, user.id, habit_id)
    if not habit:
        raise ValueError("Habit not found")

    if data.name is not None:
        habit.name = data.name.strip()
    if data.icon is not None:
        habit.icon = data.icon
    if data.cadence_type is not None:
        _validate_cadence(data.cadence_type, data.times_per_week or habit.times_per_week,
                          data.weekdays or habit.weekdays)
        habit.cadence_type = data.cadence_type
    if data.times_per_week is not None:
        habit.times_per_week = data.times_per_week
    if data.weekdays is not None:
        habit.weekdays = data.weekdays
    if data.target_value is not None:
        habit.target_value = data.target_value
    if data.program_id is not None:
        habit.program_id = data.program_id or None
    if habit.cadence_type != habit_logic.CADENCE_WEEKLY:
        habit.times_per_week = None
    if habit.cadence_type != habit_logic.CADENCE_WEEKDAYS:
        habit.weekdays = None

    db.commit()
    db.refresh(habit)
    return habit


def reorder_habits(db: Session, user: User, ordered_ids: List[int]) -> List[Habit]:
    """Set sort_order from the given id order (ids not owned by the user are ignored)."""
    habits = {h.id: h for h in get_user_habits(db, user.id, include_archived=True)}
    for idx, hid in enumerate(ordered_ids):
        habit = habits.get(hid)
        if habit:
            habit.sort_order = idx
    db.commit()
    return get_user_habits(db, user.id, include_archived=True)


def archive_habit(db: Session, user: User, habit_id: int) -> Habit:
    """Archiving frees the slot; history is retained — no data is ever lost by rotating focus."""
    habit = get_user_habit(db, user.id, habit_id)
    if not habit:
        raise ValueError("Habit not found")
    habit.status = "archived"
    habit.archived_at = utc_now()
    db.commit()
    db.refresh(habit)
    return habit


def restore_habit(db: Session, user: User, habit_id: int) -> Habit:
    habit = get_user_habit(db, user.id, habit_id)
    if not habit:
        raise ValueError("Habit not found")
    if habit.habit_type == "standard":
        slots = slot_state(db, user)
        if slots["available"] <= 0:
            raise ValueError("No free habit slots — archive another habit or level up first")
    habit.status = "active"
    habit.archived_at = None
    db.commit()
    db.refresh(habit)
    return habit


# ---------------------------------------------------------------------------
# XP helpers (attribute track writes skills; player track writes the ledger)
# ---------------------------------------------------------------------------

def _award_attribute_xp(db: Session, user_id: int, attribute: str, amount: int) -> dict:
    skill = db.query(Skill).filter(Skill.user_id == user_id, Skill.name == attribute).first()
    if not skill or amount <= 0:
        return {"attribute": attribute, "leveled_up": False, "level": skill.level if skill else None}

    level_before = skill.level
    skill.xp += amount
    skill.daily_xp_earned = max(0, (skill.daily_xp_earned or 0)) + amount
    from ..skill_manager import calculate_required_xp
    while skill.xp >= calculate_required_xp(skill.level):
        skill.xp -= calculate_required_xp(skill.level)
        skill.level += 1

    return {
        "attribute": attribute,
        "level": skill.level,
        "xp": skill.xp,
        "leveled_up": skill.level > level_before,
        "levels_gained": skill.level - level_before,
    }


def _remove_attribute_xp(db: Session, user_id: int, attribute: str, amount: int):
    skill = db.query(Skill).filter(Skill.user_id == user_id, Skill.name == attribute).first()
    if not skill or amount <= 0:
        return
    from ..skill_manager import calculate_required_xp
    skill.xp -= amount
    skill.daily_xp_earned = max(0, (skill.daily_xp_earned or 0) - amount)
    while skill.xp < 0 and skill.level > 1:
        skill.level -= 1
        skill.xp += calculate_required_xp(skill.level)
    if skill.xp < 0:
        skill.xp = 0


def _award_player_xp(db: Session, user: User, amount: int, source: str,
                     source_key: str = None, meta: dict = None):
    if amount == 0:
        return
    user.player_xp = max(0, (user.player_xp or 0) + amount)
    db.add(PlayerXPEvent(user_id=user.id, amount=amount, source=source,
                         source_key=source_key, meta=meta))


def _player_xp_event_exists(db: Session, user_id: int, source: str, source_key: str) -> bool:
    return db.query(PlayerXPEvent.id).filter(
        PlayerXPEvent.user_id == user_id,
        PlayerXPEvent.source == source,
        PlayerXPEvent.source_key == source_key,
    ).first() is not None


def _attribute_xp_earned_on(db: Session, user_id: int, attribute: str, on_date: date) -> int:
    total = db.query(func.coalesce(func.sum(HabitLog.attribute_xp), 0)).filter(
        HabitLog.user_id == user_id,
        HabitLog.attribute == attribute,
        HabitLog.date == on_date,
    ).scalar()
    return int(total or 0)


# ---------------------------------------------------------------------------
# Day-complete state
# ---------------------------------------------------------------------------

def _scheduled_habits_on(habits: List[Habit], d: date) -> List[Habit]:
    return [h for h in habits if habit_logic.is_scheduled_on(h.cadence_type, h.weekdays, d)]


def recompute_day_completion(db: Session, user: User, target_date: date) -> dict:
    """
    Recompute scheduled/completed counts for a date and settle the player-XP
    delta against what was already paid. Used on every log, edit, undo and
    backfill — upgrades pay the difference, downgrades claw it back.
    """
    habits = get_user_habits(db, user.id, include_archived=False)
    scheduled = _scheduled_habits_on(habits, target_date)
    scheduled_ids = [h.id for h in scheduled]

    completed = 0
    if scheduled_ids:
        completed = db.query(func.count(HabitLog.id)).filter(
            HabitLog.user_id == user.id,
            HabitLog.date == target_date,
            HabitLog.habit_id.in_(scheduled_ids),
        ).scalar() or 0

    status = xp_engine.day_status(len(scheduled), completed)
    target_xp = xp_engine.day_target_player_xp(len(scheduled), completed)

    row = db.query(DayCompletion).filter(
        DayCompletion.user_id == user.id, DayCompletion.date == target_date
    ).first()
    previous_status = row.status if row else "none"
    paid = row.player_xp if row else 0

    if not row:
        row = DayCompletion(user_id=user.id, date=target_date)
        db.add(row)

    row.scheduled_count = len(scheduled)
    row.completed_count = completed
    row.status = status

    delta = target_xp - paid
    if delta != 0:
        _award_player_xp(db, user, delta,
                         source="day_complete" if target_xp >= paid else "day_complete_reversal",
                         source_key=str(target_date),
                         meta={"status": status, "scheduled": len(scheduled), "completed": completed})
        row.player_xp = target_xp

    return {
        "date": str(target_date),
        "scheduled": len(scheduled),
        "completed": completed,
        "status": status,
        "previous_status": previous_status,
        "became_complete": status == "complete" and previous_status != "complete",
        "became_partial": status == "partial" and previous_status == "none",
        "bonus_paid": max(0, delta),
    }


def _day_streak(db: Session, user_id: int, today: date) -> int:
    rows = db.query(DayCompletion.date).filter(
        DayCompletion.user_id == user_id, DayCompletion.status == "complete"
    ).all()
    return habit_logic.day_streak({r.date for r in rows}, today)


# ---------------------------------------------------------------------------
# Logging (the one-tap path) + undo + edit
# ---------------------------------------------------------------------------

def _validate_log_date(user_today: date, log_date: date):
    if log_date > user_today:
        raise ValueError("Cannot log habits for future dates")
    if (user_today - log_date).days > BACKFILL_WINDOW_DAYS:
        raise ValueError(f"Logs can only be added or changed within the {BACKFILL_WINDOW_DAYS * 24}h window")


def _habit_log_dates(db: Session, habit_id: int) -> set:
    rows = db.query(HabitLog.date).filter(HabitLog.habit_id == habit_id).all()
    return {r.date for r in rows}


def _sync_weight_tracking(db: Session, user: User, log: HabitLog, habit: Habit):
    """Weigh-in values feed the existing weight trend/goal charts."""
    if habit.measurement_kind != "weight" or log.value is None:
        return
    entry_dt = datetime(log.date.year, log.date.month, log.date.day, 12, 0)
    # Goal weight now lives on the Weigh-in habit (target_value); bridge it to the
    # legacy WeightTracking row so existing weight-chart endpoints keep working.
    goal = habit.target_value
    is_first = db.query(activity_model.WeightTracking.id).filter(
        activity_model.WeightTracking.user_id == user.id).first() is None
    db.add(activity_model.WeightTracking(
        user_id=user.id,
        weight=log.value,
        date=entry_dt,
        weight_goal=goal,
        is_starting_weight=is_first,
    ))


def _auto_progress_challenge(db: Session, user: User, habit: Habit, log_date: date, user_today: date) -> Optional[dict]:
    """
    Habit-contract challenges auto-progress from normal Today-view logs —
    no double logging. Matches the active challenge's activity_type against
    the bucket's challenge tags.
    """
    if log_date != user_today:
        return None
    try:
        from . import challenge_crud
        active = challenge_crud.get_user_active_challenge(db, user.id)
        if not active:
            return None
        challenge = active.challenge
        tags = set((habit.bucket.challenge_tags or []) + [habit.bucket.key])
        if not challenge.activity_type or challenge.activity_type not in tags:
            return None
        progress = challenge_crud.mark_day_complete(
            db, user.id, activity_data={"source": "habit_log", "habit_id": habit.id, "habit_name": habit.name}
        )
        db.refresh(active)
        return {
            "progressed": True,
            "challenge_id": challenge.id,
            "title": challenge.title,
            "icon": challenge.icon,
            "completed_days": len(active.progress_entries),
            "duration_days": challenge.duration_days,
            "challenge_completed": active.is_completed,
            "xp_awarded": progress.xp_awarded if progress else 0,
        }
    except ValueError:
        return None  # already completed today / outside period — nothing to do
    except Exception:
        logger.exception("Challenge auto-progress failed (non-fatal)")
        return None


def log_habit(db: Session, user: User, habit_id: int, payload: habit_schema.HabitLogCreate,
              allow_archived: bool = False) -> dict:
    """
    The core action of the app. Creates the day's log, pays both XP tracks,
    updates streaks/day-state/challenge, and returns everything the feedback
    layer needs to celebrate it.

    allow_archived: the focus-session bridge still pays XP on an archived
    linked habit; archived habits aren't scheduled, so Today/day-complete
    stay unaffected.
    """
    habit = get_user_habit(db, user.id, habit_id)
    if not habit or (habit.status != "active" and not allow_archived):
        raise ValueError("Habit not found")

    user_today = get_user_today(db, user.id)
    log_date = payload.date or user_today
    _validate_log_date(user_today, log_date)

    if habit.habit_type == "measurement" and payload.value is None:
        raise ValueError(f"This habit logs a value ({habit.measurement_unit or 'number'})")

    player_before = xp_engine.player_level_from_xp(user.player_xp)

    existing = db.query(HabitLog).filter(
        HabitLog.habit_id == habit.id, HabitLog.date == log_date).first()
    if existing:
        # Idempotent for optimistic-UI retries: re-logging adds data, not XP.
        return {"already_logged": True, "log": _log_dict(existing), "habit_id": habit.id}

    bucket = habit.bucket
    attribute = bucket.attribute if habit.habit_type == "standard" else None

    log = HabitLog(
        habit_id=habit.id,
        user_id=user.id,
        date=log_date,
        value=payload.value,
        duration_minutes=payload.duration_minutes,
        distance=payload.distance,
        quantity=payload.quantity,
        note=payload.note,
        attribute=attribute,
        is_backfill=log_date != user_today,
    )
    db.add(log)
    db.flush()

    # --- Attribute XP track ---
    xp_breakdown = None
    attribute_state = None
    if attribute:
        dates = _habit_log_dates(db, habit.id)
        streak_now = habit_logic.current_streak(
            habit.cadence_type, habit.weekdays, habit.times_per_week, dates, user_today)
        earned_today = _attribute_xp_earned_on(db, user.id, attribute, log_date)
        xp_breakdown = xp_engine.attribute_xp(
            base_xp=bucket.base_xp,
            detail_kind=bucket.detail_kind,
            streak=streak_now,
            attribute_xp_earned_today=earned_today,
            duration_minutes=payload.duration_minutes,
            distance=payload.distance,
            quantity=payload.quantity,
            # volume-detail buckets (strength) carry session volume in the generic value field
            volume=payload.value if bucket.detail_kind == "volume" else None,
        )
        log.attribute_xp = xp_breakdown["total"]
        attribute_state = _award_attribute_xp(db, user.id, attribute, xp_breakdown["total"])

    # --- Player XP track ---
    if habit.habit_type == "measurement":
        log.player_xp = xp_engine.MEASUREMENT_PLAYER_XP
        _award_player_xp(db, user, log.player_xp, source="measurement",
                         source_key=f"habit:{habit.id}:{log_date}")
        _sync_weight_tracking(db, user, log, habit)

    # Streak milestones pay player XP once per habit per milestone.
    dates = _habit_log_dates(db, habit.id)
    streak = habit_logic.current_streak(
        habit.cadence_type, habit.weekdays, habit.times_per_week, dates, user_today)
    milestone_hit = None
    milestone_bonus = xp_engine.streak_milestone_bonus(streak)
    if milestone_bonus:
        key = f"habit:{habit.id}:milestone:{streak}"
        if not _player_xp_event_exists(db, user.id, "streak_milestone", key):
            _award_player_xp(db, user, milestone_bonus, source="streak_milestone", source_key=key,
                             meta={"habit": habit.name, "streak": streak})
            milestone_hit = {"streak": streak, "bonus": milestone_bonus}

    # --- Day-complete state (the dopamine anchor) ---
    day = recompute_day_completion(db, user, log_date)

    # --- Challenge auto-progress (connects the islands) ---
    challenge = _auto_progress_challenge(db, user, habit, log_date, user_today)

    db.commit()
    db.refresh(user)

    player_after = xp_engine.player_level_from_xp(user.player_xp)
    return {
        "log": _log_dict(log),
        "habit_id": habit.id,
        "habit_name": habit.name,
        "attribute": attribute,
        "xp": xp_breakdown,
        "attribute_state": attribute_state,
        "streak": {"current": streak, "milestone": milestone_hit},
        "day": {**day, "day_streak": _day_streak(db, user.id, user_today)},
        "player": {**player_after, "leveled_up": player_after["level"] > player_before["level"]},
        "challenge": challenge,
    }


def update_log(db: Session, user: User, habit_id: int, log_date: date,
               payload: habit_schema.HabitLogUpdate) -> dict:
    """48h edit window: editing adds data, never XP."""
    habit = get_user_habit(db, user.id, habit_id)
    if not habit:
        raise ValueError("Habit not found")
    user_today = get_user_today(db, user.id)
    _validate_log_date(user_today, log_date)

    log = db.query(HabitLog).filter(HabitLog.habit_id == habit.id, HabitLog.date == log_date).first()
    if not log:
        raise ValueError("No log for that date")

    for field in ("value", "duration_minutes", "distance", "quantity", "note"):
        new_value = getattr(payload, field)
        if new_value is not None:
            setattr(log, field, new_value)

    if habit.measurement_kind == "weight" and payload.value is not None:
        entry = db.query(activity_model.WeightTracking).filter(
            activity_model.WeightTracking.user_id == user.id,
            func.date(activity_model.WeightTracking.date) == log_date,
        ).order_by(activity_model.WeightTracking.id.desc()).first()
        if entry:
            entry.weight = payload.value

    db.commit()
    return {"log": _log_dict(log), "habit_id": habit.id}


def delete_log(db: Session, user: User, habit_id: int, log_date: date) -> dict:
    """Undo within the 48h window. Reverses exactly what the log paid."""
    habit = get_user_habit(db, user.id, habit_id)
    if not habit:
        raise ValueError("Habit not found")
    user_today = get_user_today(db, user.id)
    _validate_log_date(user_today, log_date)

    log = db.query(HabitLog).filter(HabitLog.habit_id == habit.id, HabitLog.date == log_date).first()
    if not log:
        raise ValueError("No log for that date")

    if log.attribute and log.attribute_xp:
        _remove_attribute_xp(db, user.id, log.attribute, log.attribute_xp)
    if log.player_xp:
        _award_player_xp(db, user, -log.player_xp, source="measurement_reversal",
                         source_key=f"habit:{habit.id}:{log_date}")
    if habit.measurement_kind == "weight" and log.value is not None:
        db.query(activity_model.WeightTracking).filter(
            activity_model.WeightTracking.user_id == user.id,
            func.date(activity_model.WeightTracking.date) == log_date,
            activity_model.WeightTracking.weight == log.value,
        ).delete(synchronize_session=False)

    db.delete(log)
    db.flush()

    day = recompute_day_completion(db, user, log_date)
    db.commit()
    db.refresh(user)

    return {
        "deleted": True,
        "habit_id": habit.id,
        "day": {**day, "day_streak": _day_streak(db, user.id, user_today)},
        "player": xp_engine.player_level_from_xp(user.player_xp),
    }


# ---------------------------------------------------------------------------
# The Today view payload
# ---------------------------------------------------------------------------

def _log_dict(log: HabitLog) -> dict:
    return {
        "id": log.id,
        "habit_id": log.habit_id,
        "date": str(log.date),
        "value": log.value,
        "duration_minutes": log.duration_minutes,
        "distance": log.distance,
        "quantity": log.quantity,
        "note": log.note,
        "attribute": log.attribute,
        "attribute_xp": log.attribute_xp,
        "player_xp": log.player_xp,
        "is_backfill": bool(log.is_backfill),
    }


def _habit_today_dict(db: Session, habit: Habit, user_today: date) -> dict:
    dates = _habit_log_dates(db, habit.id)
    today_log = None
    if user_today in dates:
        row = db.query(HabitLog).filter(
            HabitLog.habit_id == habit.id, HabitLog.date == user_today).first()
        today_log = _log_dict(row) if row else None

    last_value = None
    if habit.habit_type == "measurement":
        prev = (
            db.query(HabitLog.value)
            .filter(HabitLog.habit_id == habit.id,
                    HabitLog.date < user_today,
                    HabitLog.value.isnot(None))
            .order_by(HabitLog.date.desc())
            .first()
        )
        last_value = prev[0] if prev else None

    bucket = habit.bucket
    return {
        "id": habit.id,
        "name": habit.name,
        "last_value": last_value,
        "icon": habit.icon or (bucket.icon if bucket else None),
        "bucket_key": bucket.key if bucket else None,
        "bucket_name": bucket.name if bucket else None,
        "bucket_color": bucket.color if bucket else None,
        "attribute": bucket.attribute if (bucket and habit.habit_type == "standard") else None,
        "detail_kind": bucket.detail_kind if bucket else "none",
        "base_xp": bucket.base_xp if bucket else 0,
        "habit_type": habit.habit_type,
        "measurement_kind": habit.measurement_kind,
        "measurement_unit": habit.measurement_unit,
        "target_value": habit.target_value,
        "program_id": habit.program_id,
        "cadence_type": habit.cadence_type,
        "times_per_week": habit.times_per_week,
        "weekdays": habit.weekdays,
        "completed_today": user_today in dates,
        "today_log": today_log,
        "current_streak": habit_logic.current_streak(
            habit.cadence_type, habit.weekdays, habit.times_per_week, dates, user_today),
        "best_streak": habit_logic.best_streak(
            habit.cadence_type, habit.weekdays, habit.times_per_week, dates),
        "week_count": habit_logic.week_count(dates, user_today),
        "total_completions": len(dates),
        "yesterday_logged": (user_today - timedelta(days=1)) in dates,
    }


def get_today(db: Session, user: User) -> dict:
    """Everything the Today view needs in one call. One screen, loads instantly."""
    user_today = get_user_today(db, user.id)
    habits = get_user_habits(db, user.id, include_archived=False)

    today_habits = []
    weekly_habits = []
    for habit in habits:
        info = _habit_today_dict(db, habit, user_today)
        if habit.cadence_type == habit_logic.CADENCE_WEEKLY:
            weekly_habits.append(info)
        else:
            today_habits.append(info)

    scheduled = [h for h in today_habits if habit_logic.is_scheduled_on(
        h["cadence_type"], h["weekdays"], user_today)]
    completed = [h for h in scheduled if h["completed_today"]]
    status = xp_engine.day_status(len(scheduled), len(completed))

    player = xp_engine.player_level_from_xp(user.player_xp)
    slots = slot_state(db, user)

    # Active challenge strip
    challenge_payload = None
    try:
        from . import challenge_crud
        data = challenge_crud.get_challenge_with_progress(db, user.id)
        if data:
            uc = data["user_challenge"]
            challenge_payload = {
                "user_challenge_id": uc.id,
                "challenge_id": uc.challenge.id,
                "title": uc.challenge.title,
                "icon": uc.challenge.icon,
                "current_day": data["current_day"],
                "duration_days": uc.challenge.duration_days,
                "completed_days": data["completed_days"],
                "today_completed": data["today_completed"],
            }
    except Exception:
        logger.exception("Failed to load active challenge for Today view (non-fatal)")

    return {
        "date": str(user_today),
        "weekday": user_today.weekday(),
        "player": {**player, "slots": slots},
        "day": {
            "scheduled": len(scheduled),
            "completed": len(completed),
            "status": status,
            "is_complete": status == "complete",
            "day_streak": _day_streak(db, user.id, user_today),
        },
        "habits_today": today_habits,
        "habits_weekly": weekly_habits,
        "active_challenge": challenge_payload,
        "backfill_window_days": BACKFILL_WINDOW_DAYS,
    }


# ---------------------------------------------------------------------------
# Heatmap + stats overview (meaningful numbers only)
# ---------------------------------------------------------------------------

def get_heatmap(db: Session, user: User, days: int = 182, habit_id: Optional[int] = None) -> dict:
    """Per-day completion counts for the streak heatmap (the ripples replacement)."""
    user_today = get_user_today(db, user.id)
    start = user_today - timedelta(days=days - 1)

    log_query = db.query(HabitLog.date, func.count(HabitLog.id)).filter(
        HabitLog.user_id == user.id, HabitLog.date >= start)
    if habit_id:
        log_query = log_query.filter(HabitLog.habit_id == habit_id)
    counts = dict(log_query.group_by(HabitLog.date).all())

    statuses = {}
    if not habit_id:
        rows = db.query(DayCompletion).filter(
            DayCompletion.user_id == user.id, DayCompletion.date >= start).all()
        statuses = {r.date: r for r in rows}

    days_out = []
    cursor = start
    while cursor <= user_today:
        row = statuses.get(cursor)
        days_out.append({
            "date": str(cursor),
            "count": int(counts.get(cursor, 0)),
            "scheduled": row.scheduled_count if row else None,
            "status": row.status if row else ("logged" if counts.get(cursor) else "none"),
        })
        cursor += timedelta(days=1)

    return {"start": str(start), "end": str(user_today), "days": days_out}


def get_heatmap_by_habit(db: Session, user: User, days: int = 126) -> dict:
    """Every habit's grid + streak in one call — feeds the iOS home-screen
    widget's per-habit cards (fetched native-only, so the web never pays)."""
    user_today = get_user_today(db, user.id)
    start = user_today - timedelta(days=days - 1)
    habits = get_user_habits(db, user.id, include_archived=False)

    rows = db.query(HabitLog.habit_id, HabitLog.date, func.count(HabitLog.id)).filter(
        HabitLog.user_id == user.id, HabitLog.date >= start).group_by(
        HabitLog.habit_id, HabitLog.date).all()
    counts_by_habit = {}
    for habit_id, log_date, n in rows:
        counts_by_habit.setdefault(habit_id, {})[log_date] = int(n)

    out = []
    for habit in habits:
        counts = counts_by_habit.get(habit.id, {})
        dates = _habit_log_dates(db, habit.id)  # full history, for streaks
        days_out = []
        cursor = start
        while cursor <= user_today:
            n = counts.get(cursor, 0)
            days_out.append({
                "date": str(cursor),
                "count": n,
                "status": "complete" if n else "none",
            })
            cursor += timedelta(days=1)
        out.append({
            "id": habit.id,
            "name": habit.name,
            "icon": habit.icon or (habit.bucket.icon if habit.bucket else None),
            "cadence_type": habit.cadence_type,
            "times_per_week": habit.times_per_week,
            "current_streak": habit_logic.current_streak(
                habit.cadence_type, habit.weekdays, habit.times_per_week, dates, user_today),
            "completed_today": user_today in dates,
            "week_count": habit_logic.week_count(dates, user_today),
            "days": days_out,
        })
    return {"start": str(start), "end": str(user_today), "habits": out}


def get_stats_overview(db: Session, user: User) -> dict:
    """Numbers a user can look at and FEEL progress (or its absence)."""
    user_today = get_user_today(db, user.id)
    habits = get_user_habits(db, user.id, include_archived=False)

    completions = db.query(DayCompletion).filter(DayCompletion.user_id == user.id).all()
    complete_dates = {c.date for c in completions if c.status == "complete"}
    thirty_ago = user_today - timedelta(days=29)
    days_with_schedule_30d = [c for c in completions if c.date >= thirty_ago and c.scheduled_count > 0]
    complete_30d = [c for c in days_with_schedule_30d if c.status == "complete"]

    distinct_log_days = db.query(func.count(func.distinct(HabitLog.date))).filter(
        HabitLog.user_id == user.id).scalar() or 0
    total_logs = db.query(func.count(HabitLog.id)).filter(HabitLog.user_id == user.id).scalar() or 0

    habit_stats = []
    for habit in habits:
        dates = _habit_log_dates(db, habit.id)
        aggregates = db.query(
            func.coalesce(func.sum(HabitLog.duration_minutes), 0),
            func.coalesce(func.sum(HabitLog.distance), 0),
            func.coalesce(func.sum(HabitLog.quantity), 0),
        ).filter(HabitLog.habit_id == habit.id).first()

        entry = {
            "id": habit.id,
            "name": habit.name,
            "icon": habit.icon or (habit.bucket.icon if habit.bucket else None),
            "bucket_name": habit.bucket.name if habit.bucket else None,
            "bucket_color": habit.bucket.color if habit.bucket else None,
            "attribute": habit.bucket.attribute if habit.bucket else None,
            "detail_kind": habit.bucket.detail_kind if habit.bucket else "none",
            "habit_type": habit.habit_type,
            "measurement_unit": habit.measurement_unit,
            "cadence_type": habit.cadence_type,
            "times_per_week": habit.times_per_week,
            "current_streak": habit_logic.current_streak(
                habit.cadence_type, habit.weekdays, habit.times_per_week, dates, user_today),
            "best_streak": habit_logic.best_streak(
                habit.cadence_type, habit.weekdays, habit.times_per_week, dates),
            "total_completions": len(dates),
            "completions_30d": sum(1 for d in dates if d >= thirty_ago),
            "total_duration_minutes": int(aggregates[0]),
            "total_distance": float(aggregates[1]),
            "total_quantity": int(aggregates[2]),
        }

        if habit.habit_type == "measurement":
            values = db.query(HabitLog.date, HabitLog.value).filter(
                HabitLog.habit_id == habit.id, HabitLog.value.isnot(None)
            ).order_by(HabitLog.date).all()
            if values:
                last7 = [v for d, v in values if d >= user_today - timedelta(days=6)]
                month_ago_vals = [v for d, v in values if d <= user_today - timedelta(days=30)]
                latest_val = values[-1][1]
                goal = habit.target_value
                entry["measurement"] = {
                    "latest": latest_val,
                    "latest_date": str(values[-1][0]),
                    "avg_7d": round(sum(last7) / len(last7), 1) if last7 else None,
                    "delta_30d": round(latest_val - month_ago_vals[-1], 1) if month_ago_vals else None,
                    "goal": goal,
                    "to_goal": round(latest_val - goal, 1) if goal is not None else None,
                    "history": [{"date": str(d), "value": v} for d, v in values],
                }

        if habit.bucket and habit.bucket.detail_kind == "distance_duration":
            runs = db.query(HabitLog.date, HabitLog.distance, HabitLog.duration_minutes).filter(
                HabitLog.habit_id == habit.id,
                HabitLog.distance.isnot(None), HabitLog.distance > 0,
                HabitLog.duration_minutes.isnot(None), HabitLog.duration_minutes > 0,
            ).order_by(HabitLog.date).all()
            if runs:
                entry["pace"] = {
                    "best_pace_min_per_mile": round(min(dur / dist for _, dist, dur in runs), 2),
                    "latest_pace_min_per_mile": round(runs[-1][2] / runs[-1][1], 2),
                    "history": [
                        {"date": str(d), "distance": dist, "duration": dur,
                         "pace": round(dur / dist, 2)}
                        for d, dist, dur in runs
                    ],
                }

        habit_stats.append(entry)

    player = xp_engine.player_level_from_xp(user.player_xp)
    return {
        "player": player,
        "consistency": {
            "day_streak": habit_logic.day_streak(complete_dates, user_today),
            "best_day_streak": habit_logic.best_daily_streak(complete_dates),
            "total_days_logged": int(distinct_log_days),
            "total_logs": int(total_logs),
            "complete_days": len(complete_dates),
            "day_complete_rate_30d": (
                round(len(complete_30d) / len(days_with_schedule_30d), 2)
                if days_with_schedule_30d else None
            ),
        },
        "habits": habit_stats,
    }
