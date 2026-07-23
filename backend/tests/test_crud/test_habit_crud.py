"""Habit CRUD: editing a habit in place (rename, re-cadence, goal) and the
day-completion re-settle that a cadence change triggers."""
import pytest

from app.crud import habit_crud
from app.models.habit_model import Bucket, Habit, DayCompletion
from app.models.user_model import User
from app.schemas import habit_schema
from app.utils.time import get_user_today


@pytest.fixture
def user(db):
    row = User(username="tino", email="tino@example.com", timezone="UTC", player_xp=0)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@pytest.fixture
def bucket(db):
    row = Bucket(key="strength_training", name="Strength Training", attribute="Strength",
                 detail_kind="volume", base_xp=12, icon="🏋️", is_active=True)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_habit(db, user, bucket, **overrides):
    fields = dict(user_id=user.id, bucket_id=bucket.id, name="Workout", icon="🏋️",
                  habit_type="standard", cadence_type="daily", status="active")
    fields.update(overrides)
    habit = Habit(**fields)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def test_edit_cadence_daily_to_times_per_week(db, user, bucket):
    habit = make_habit(db, user, bucket)

    updated = habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(
        cadence_type="weekly", times_per_week=4))

    assert updated.cadence_type == "weekly"
    assert updated.times_per_week == 4
    assert updated.weekdays is None


def test_edit_times_per_week_down_keeps_the_habit(db, user, bucket):
    habit = make_habit(db, user, bucket, cadence_type="weekly", times_per_week=6)

    updated = habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(times_per_week=4))

    assert (updated.id, updated.cadence_type, updated.times_per_week) == (habit.id, "weekly", 4)


def test_switching_off_weekly_clears_times_per_week(db, user, bucket):
    habit = make_habit(db, user, bucket, cadence_type="weekly", times_per_week=5)

    updated = habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(cadence_type="daily"))

    assert updated.cadence_type == "daily"
    assert updated.times_per_week is None


def test_switching_to_weekdays_keeps_only_weekdays(db, user, bucket):
    habit = make_habit(db, user, bucket, cadence_type="weekly", times_per_week=3)

    updated = habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(
        cadence_type="weekdays", weekdays=[0, 2, 4]))

    assert updated.cadence_type == "weekdays"
    assert updated.weekdays == [0, 2, 4]
    assert updated.times_per_week is None


def test_weekly_without_a_target_is_rejected(db, user, bucket):
    habit = make_habit(db, user, bucket)

    with pytest.raises(ValueError, match="times-per-week"):
        habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(cadence_type="weekly"))


def test_weekdays_without_days_is_rejected(db, user, bucket):
    habit = make_habit(db, user, bucket)

    with pytest.raises(ValueError, match="weekday"):
        habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(cadence_type="weekdays"))


def test_rename_rejects_a_duplicate_active_name(db, user, bucket):
    make_habit(db, user, bucket, name="Meditate")
    habit = make_habit(db, user, bucket, name="Workout")

    with pytest.raises(ValueError, match="already have an active habit"):
        habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(name="meditate"))


def test_rename_to_its_own_name_is_allowed(db, user, bucket):
    habit = make_habit(db, user, bucket, name="Workout")

    updated = habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(name="Workout"))

    assert updated.name == "Workout"


def test_editing_a_measurement_goal(db, user, bucket):
    habit = make_habit(db, user, bucket, name="Weigh-in", habit_type="measurement",
                       measurement_kind="weight", measurement_unit="lbs", target_value=185.0)

    updated = habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(target_value=175.5))

    assert updated.target_value == 175.5


def test_cadence_change_resettles_the_day(db, user, bucket):
    """Dropping the only unfinished habit off today's schedule completes the day
    (and pays for it) without waiting for the next log."""
    done = make_habit(db, user, bucket, name="Meditate")
    pending = make_habit(db, user, bucket, name="Workout")
    today = get_user_today(db, user.id)

    habit_crud.log_habit(db, user, done.id, habit_schema.HabitLogCreate())
    day = db.query(DayCompletion).filter(DayCompletion.user_id == user.id,
                                         DayCompletion.date == today).one()
    assert (day.status, day.scheduled_count) == ("none", 2)
    xp_before = user.player_xp

    habit_crud.update_habit(db, user, pending.id, habit_schema.HabitUpdate(
        cadence_type="weekly", times_per_week=4))

    db.refresh(day)
    assert (day.status, day.scheduled_count, day.completed_count) == ("complete", 1, 1)
    assert user.player_xp > xp_before


def test_editing_only_the_name_leaves_the_day_untouched(db, user, bucket):
    habit = make_habit(db, user, bucket, name="Meditate")
    today = get_user_today(db, user.id)
    habit_crud.log_habit(db, user, habit.id, habit_schema.HabitLogCreate())
    xp_before = user.player_xp

    habit_crud.update_habit(db, user, habit.id, habit_schema.HabitUpdate(name="Meditation"))

    day = db.query(DayCompletion).filter(DayCompletion.user_id == user.id,
                                         DayCompletion.date == today).one()
    assert (day.status, day.scheduled_count) == ("complete", 1)
    assert user.player_xp == xp_before
