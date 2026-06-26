# test_activity_crud.py
#
# Real-DB tests (the `db` fixture lives in conftest.py). These exercise the
# actual logging + streak/XP side effects rather than a mocked Session.
from datetime import date, timedelta

from app.crud.activity_crud import (
    get_user_activity_streaks,
    log_activity,
    log_weight_entry,
    map_activity_to_skill,
    update_activity_streak,
)
from app.models import user_model, skill_model, activity_model
from app.schemas import activity_schema


def _make_user(db, uid=1):
    user = user_model.User(id=uid, username=f"u{uid}", email=f"u{uid}@example.com", timezone="UTC")
    db.add(user)
    db.commit()
    return user


def _make_skill(db, user_id, name):
    db.add(skill_model.Skill(name=name, user_id=user_id, xp=0, level=1, daily_xp_earned=0))
    db.commit()


def _streak(db, user_id, activity_type):
    return (
        db.query(activity_model.ActivityStreak)
        .filter_by(user_id=user_id, activity_type=activity_type)
        .first()
    )


# --- pure mapping ----------------------------------------------------------

def test_map_activity_to_skill():
    assert map_activity_to_skill("meditate") == "Awareness"
    assert map_activity_to_skill("run") == "Endurance"
    assert map_activity_to_skill("unknown") == ""


# --- logging an activity ---------------------------------------------------

def test_log_activity_creates_record_starts_streak_and_awards_xp(db):
    user = _make_user(db)
    _make_skill(db, user.id, "Awareness")

    activity = log_activity(
        db, user.id, activity_schema.ActivityLog(activity_type="meditate", duration=30)
    )

    assert activity.user_id == user.id
    assert activity.activity_type == "meditate"
    # 30 min = 5 (first of day) + (30//5)*5 = 35 XP, routed to Awareness.
    assert activity.xp_earned == 35
    awareness = db.query(skill_model.Skill).filter_by(user_id=user.id, name="Awareness").one()
    assert awareness.daily_xp_earned == 35

    streak = _streak(db, user.id, "meditate")
    assert streak.current_streak == 1
    assert streak.last_activity_date == date.today()


# --- logging a weight entry ------------------------------------------------

def test_log_weight_entry_creates_entry_and_starts_streak(db):
    user = _make_user(db)
    _make_skill(db, user.id, "Strength")

    entry = log_weight_entry(
        db, user.id,
        activity_schema.WeightEntry(weight=170, date=date.today(), weight_goal=180),
    )

    assert entry.user_id == user.id
    assert entry.weight == 170
    assert entry.weight_goal == 180
    assert entry.is_starting_weight is True

    streak = _streak(db, user.id, "weight_tracking")
    assert streak.current_streak == 1
    assert streak.last_activity_date == date.today()


# --- streak math -----------------------------------------------------------

def test_update_activity_streak_starts_new(db):
    user = _make_user(db)
    update_activity_streak(db, user.id, "meditate", date.today())
    db.commit()
    assert _streak(db, user.id, "meditate").current_streak == 1


def test_update_activity_streak_increments_on_consecutive_day(db):
    user = _make_user(db)
    today = date.today()
    db.add(activity_model.ActivityStreak(
        user_id=user.id, activity_type="meditate",
        current_streak=3, last_activity_date=today - timedelta(days=1),
    ))
    db.commit()

    update_activity_streak(db, user.id, "meditate", today)
    db.commit()

    streak = _streak(db, user.id, "meditate")
    assert streak.current_streak == 4
    assert streak.last_activity_date == today


def test_update_activity_streak_resets_after_gap(db):
    user = _make_user(db)
    today = date.today()
    db.add(activity_model.ActivityStreak(
        user_id=user.id, activity_type="meditate",
        current_streak=5, last_activity_date=today - timedelta(days=3),
    ))
    db.commit()

    update_activity_streak(db, user.id, "meditate", today)
    db.commit()

    assert _streak(db, user.id, "meditate").current_streak == 1


def test_update_activity_streak_same_day_is_noop(db):
    user = _make_user(db)
    today = date.today()
    db.add(activity_model.ActivityStreak(
        user_id=user.id, activity_type="meditate",
        current_streak=3, last_activity_date=today,
    ))
    db.commit()

    update_activity_streak(db, user.id, "meditate", today)
    db.commit()

    assert _streak(db, user.id, "meditate").current_streak == 3


# --- fetching streaks ------------------------------------------------------

def test_get_user_activity_streaks(db):
    user = _make_user(db)
    db.add(activity_model.ActivityStreak(
        user_id=user.id, activity_type="meditate",
        current_streak=2, last_activity_date=date.today(),
    ))
    db.commit()

    streaks = list(get_user_activity_streaks(db, user.id))
    assert len(streaks) == 1
    assert streaks[0].activity_type == "meditate"
