"""Strava import mapping: sport filtering, dedup, same-day aggregation, backfill
beyond the manual window, and state signing."""
from datetime import date, timedelta

import pytest

from app.crud import strava_crud, habit_crud
from app.models.habit_model import Bucket, Habit, HabitLog, DayCompletion
from app.models.strava_model import StravaConnection, StravaActivityImport
from app.models.skill_model import Skill
from app.models.user_model import User
from app.utils.time import get_user_today


@pytest.fixture
def user(db):
    row = User(username="tino", email="tino@example.com", timezone="UTC", player_xp=0)
    db.add(row)
    db.add(Skill(user_id=1, name="Endurance", xp=0, level=1))
    db.commit()
    db.refresh(row)
    return row


@pytest.fixture
def cardio(db):
    row = Bucket(key="cardio", name="Cardio", attribute="Endurance",
                 detail_kind="distance_duration", base_xp=10, icon="🏃", is_active=True)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@pytest.fixture
def habit(db, user, cardio):
    row = Habit(user_id=user.id, bucket_id=cardio.id, name="Run", icon="🏃",
                habit_type="standard", cadence_type="weekly", times_per_week=4, status="active")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@pytest.fixture
def connection(db, user, habit):
    row = StravaConnection(user_id=user.id, athlete_id=999, access_token="a",
                           refresh_token="r", expires_at=9999999999,
                           target_habit_id=habit.id, import_rides=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def run(activity_id, day: date, meters=5000.0, seconds=1800, sport="Run"):
    return {"id": activity_id, "sport_type": sport, "distance": meters,
            "moving_time": seconds, "start_date_local": f"{day.isoformat()}T07:00:00Z"}


def test_import_maps_a_run_to_a_habit_log(db, user, habit, connection):
    today = get_user_today(db, user.id)
    result = strava_crud.import_activities(db, user, [run(1, today, meters=1609.34, seconds=1200)])

    assert result["imported"] == 1
    log = db.query(HabitLog).filter(HabitLog.habit_id == habit.id, HabitLog.date == today).one()
    assert log.source == "strava"
    assert log.external_ref == "strava:1"
    assert log.distance == pytest.approx(1.0, abs=0.01)   # 1609.34 m → 1 mile
    assert log.duration_minutes == pytest.approx(20.0)    # 1200 s → 20 min
    assert db.query(StravaActivityImport).count() == 1


def test_reimport_is_idempotent(db, user, habit, connection):
    today = get_user_today(db, user.id)
    strava_crud.import_activities(db, user, [run(1, today)])
    result = strava_crud.import_activities(db, user, [run(1, today)])

    assert result["imported"] == 0
    assert result["skipped_duplicate"] == 1
    assert db.query(HabitLog).filter(HabitLog.habit_id == habit.id).count() == 1
    assert db.query(StravaActivityImport).count() == 1


def test_two_runs_same_day_accumulate_into_one_log(db, user, habit, connection):
    today = get_user_today(db, user.id)
    result = strava_crud.import_activities(db, user, [
        run(1, today, meters=1609.34, seconds=600),
        run(2, today, meters=1609.34, seconds=900),
    ])

    assert result["imported"] == 2
    assert result["days_logged"] == 1
    logs = db.query(HabitLog).filter(HabitLog.habit_id == habit.id, HabitLog.date == today).all()
    assert len(logs) == 1
    assert logs[0].distance == pytest.approx(2.0, abs=0.02)
    assert logs[0].duration_minutes == pytest.approx(25.0)


def test_rides_excluded_unless_opted_in(db, user, habit, connection):
    today = get_user_today(db, user.id)
    result = strava_crud.import_activities(db, user, [run(1, today, sport="Ride")])
    assert result["imported"] == 0

    connection.import_rides = True
    db.commit()
    result = strava_crud.import_activities(db, user, [run(1, today, sport="Ride")])
    assert result["imported"] == 1


def test_non_cardio_sports_are_ignored(db, user, habit, connection):
    today = get_user_today(db, user.id)
    result = strava_crud.import_activities(db, user, [run(1, today, sport="WeightTraining")])
    assert result["imported"] == 0


def test_backfills_a_run_older_than_the_manual_window(db, user, habit, connection):
    old_day = get_user_today(db, user.id) - timedelta(days=10)
    result = strava_crud.import_activities(db, user, [run(1, old_day)])

    assert result["imported"] == 1
    log = db.query(HabitLog).filter(HabitLog.habit_id == habit.id, HabitLog.date == old_day).one()
    assert log.is_backfill is True


def test_future_activity_is_skipped(db, user, habit, connection):
    future = get_user_today(db, user.id) + timedelta(days=1)
    result = strava_crud.import_activities(db, user, [run(1, future)])
    assert result["imported"] == 0


def test_import_pays_attribute_xp_through_the_normal_engine(db, user, habit, connection):
    """An imported run pays Endurance XP exactly like a manual log. (Player XP for
    this weekly habit is 0 until the weekly-completion reward ships — see
    weekly-completion-rewards.md; a daily habit would earn day-complete XP here.)"""
    today = get_user_today(db, user.id)
    result = strava_crud.import_activities(db, user, [run(1, today)])

    assert result["xp_awarded"] > 0
    skill = db.query(Skill).filter(Skill.name == "Endurance").one()
    assert skill.xp > 0
    log = db.query(HabitLog).filter(HabitLog.habit_id == habit.id, HabitLog.date == today).one()
    assert log.attribute_xp > 0


def test_import_into_a_daily_habit_pays_player_xp_and_completes_the_day(db, user, habit, connection):
    habit.cadence_type = "daily"
    habit.times_per_week = None
    db.commit()
    today = get_user_today(db, user.id)
    xp_before = user.player_xp

    strava_crud.import_activities(db, user, [run(1, today)])

    db.refresh(user)
    assert user.player_xp > xp_before
    day = db.query(DayCompletion).filter(DayCompletion.user_id == user.id,
                                         DayCompletion.date == today).one()
    assert day.status == "complete"


def test_import_without_a_target_habit_errors(db, user, habit, connection):
    connection.target_habit_id = None
    db.commit()
    with pytest.raises(ValueError, match="Cardio habit"):
        strava_crud.import_activities(db, user, [run(1, get_user_today(db, user.id))])


def test_state_roundtrip(db):
    token = strava_crud.sign_state(42, "ios")
    assert strava_crud.verify_state(token) == (42, "ios")


def test_state_rejects_garbage(db):
    with pytest.raises(ValueError):
        strava_crud.verify_state("not-a-token")


def test_status_lists_cardio_habits_and_connection(db, user, habit, connection):
    st = strava_crud.status(db, user)
    assert st["connected"] is True
    assert st["target_habit_id"] == habit.id
    assert [h["id"] for h in st["cardio_habits"]] == [habit.id]
