# test_workout_crud.py
#
# Integration-style tests backed by a real in-memory SQLite database. The CRUD
# here is query-heavy (joins, ordering, day-cycle inference), so a mocked Session
# can't meaningfully exercise it - we run against actual tables instead.
import pytest
from datetime import datetime

from app.models import workout_model, user_model
from app.crud import workout_crud
from app.schemas import workout_schema

# The `db` fixture (fresh in-memory SQLite session) is provided by conftest.py.


# --- helpers ---------------------------------------------------------------

def _make_user(db, uid=1):
    user = user_model.User(id=uid, username=f"u{uid}", email=f"u{uid}@example.com", timezone="UTC")
    db.add(user)
    db.commit()
    return user


def _make_exercise(db, name):
    # Lookup FKs are non-null in the model but SQLite doesn't enforce FKs by
    # default, so placeholder ids keep the fixtures lean.
    ex = workout_model.Exercise(
        name=name, category_id=1, muscle_group_id=1, equipment_id=1,
        difficulty_level_id=1, exercise_type_id=1,
    )
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


def _make_ppl_program(db, user_id, day_names=("Push", "Pull", "Legs")):
    """A program with one distinct exercise per day, so inference is unambiguous."""
    days = []
    for name in day_names:
        ex = _make_exercise(db, f"{name} Press")
        days.append(workout_schema.WorkoutDayCreate(
            day_name=name,
            exercises=[workout_schema.ProgramExerciseCreate(exercise_id=ex.exercise_id, sets=3)],
        ))
    return workout_crud.create_workout_program(
        db, user_id, workout_schema.WorkoutProgramCreate(name="PPL", workout_days=days)
    )


def _ordered_days(db, program_id):
    return (
        db.query(workout_model.WorkoutDay)
        .filter_by(program_id=program_id)
        .order_by(workout_model.WorkoutDay.day_id)
        .all()
    )


_UNSET = object()


def _insert_session(db, user_id, program_id, when, day, day_id=_UNSET):
    """Insert a session that performed `day`'s exercises. `day_id` defaults to the
    real day id; pass None to simulate a legacy session, or a value to override."""
    stored_day_id = day.day_id if day_id is _UNSET else day_id
    session = workout_model.WorkoutSession(
        user_id=user_id, program_id=program_id, day_id=stored_day_id, session_date=when,
    )
    db.add(session)
    db.flush()
    for pe in day.exercises:
        se = workout_model.SessionExercise(
            session_id=session.session_id, exercise_id=pe.exercise_id,
            total_volume=0, total_intensity_score=0,
        )
        db.add(se)
        db.flush()
        db.add(workout_model.WorkoutSet(
            session_exercise_id=se.session_exercise_id, set_number=1,
            performed_weight=100, performed_reps=5, performed_duration_seconds=None,
        ))
    db.commit()
    return session


# --- program CRUD ----------------------------------------------------------

def test_create_workout_program(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)

    assert program.user_id == user.id
    assert program.name == "PPL"
    days = _ordered_days(db, program.program_id)
    assert [d.day_name for d in days] == ["Push", "Pull", "Legs"]
    assert all(len(d.exercises) == 1 for d in days)


def test_create_duplicate_program_name_raises(db):
    user = _make_user(db)
    _make_ppl_program(db, user.id)
    # The name-collision check runs before any rows are built, so an empty day
    # list is enough to trigger it.
    with pytest.raises(ValueError):
        workout_crud.create_workout_program(
            db, user.id, workout_schema.WorkoutProgramCreate(name="PPL", workout_days=[])
        )


def test_get_user_workout_programs_filters_archived(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)

    programs, has_archived = workout_crud.get_user_workout_programs(db, user.id)
    assert [p.program_id for p in programs] == [program.program_id]
    assert has_archived is False

    workout_crud.archive_workout_program(db, program.program_id)
    programs, has_archived = workout_crud.get_user_workout_programs(db, user.id)
    assert programs == []
    assert has_archived is True


# --- logging a session -----------------------------------------------------

def test_log_workout_session_persists_day_and_sets(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push = _ordered_days(db, program.program_id)[0]
    pe = push.exercises[0]

    workout_crud.log_workout_session(
        db,
        workout_schema.WorkoutSessionCreate(
            program_id=program.program_id,
            day_id=push.day_id,
            session_date=datetime(2026, 6, 20, 10, 0, 0),
            exercises=[workout_schema.SessionExerciseCreate(
                program_exercise_id=pe.program_exercise_id,
                sets=[workout_schema.WorkoutSetCreate(set_number=1, weight=80, reps=5)],
            )],
            habit_id=None,
        ),
        user.id,
    )

    saved = db.query(workout_model.WorkoutSession).one()
    assert saved.day_id == push.day_id
    sets = db.query(workout_model.WorkoutSet).all()
    assert len(sets) == 1
    assert sets[0].performed_weight == 80
    assert sets[0].performed_reps == 5


# --- session context (next-day suggestion) ---------------------------------

def test_session_context_no_sessions_suggests_first_day(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    first_day = _ordered_days(db, program.program_id)[0]

    ctx = workout_crud.get_session_context(db, user.id, program.program_id)
    assert ctx["last_session"] is None
    assert ctx["suggested_day_id"] == first_day.day_id


def test_session_context_suggests_next_day(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push, pull, _ = _ordered_days(db, program.program_id)
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push)

    ctx = workout_crud.get_session_context(db, user.id, program.program_id)
    assert ctx["last_session"]["day_name"] == "Push"
    assert ctx["suggested_day_id"] == pull.day_id


def test_session_context_wraps_around_after_last_day(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push, _, legs = _ordered_days(db, program.program_id)
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), legs)

    ctx = workout_crud.get_session_context(db, user.id, program.program_id)
    assert ctx["last_session"]["day_name"] == "Legs"
    assert ctx["suggested_day_id"] == push.day_id


def test_session_context_uses_most_recent_session(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push, pull, legs = _ordered_days(db, program.program_id)
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 18), legs)
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 21), pull)  # newest

    ctx = workout_crud.get_session_context(db, user.id, program.program_id)
    assert ctx["last_session"]["day_name"] == "Pull"
    assert ctx["suggested_day_id"] == legs.day_id


def test_session_context_infers_day_for_legacy_session(db):
    """Sessions logged before day_id existed (NULL) are inferred from exercises."""
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push, pull, _ = _ordered_days(db, program.program_id)
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push, day_id=None)

    ctx = workout_crud.get_session_context(db, user.id, program.program_id)
    assert ctx["last_session"]["day_id"] == push.day_id
    assert ctx["last_session"]["day_name"] == "Push"
    assert ctx["suggested_day_id"] == pull.day_id


def test_session_context_summary_includes_sets(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push = _ordered_days(db, program.program_id)[0]
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push)

    last = workout_crud.get_session_context(db, user.id, program.program_id)["last_session"]
    assert last["exercises"][0]["name"] == "Push Press"
    assert last["exercises"][0]["sets"][0]["weight"] == 100
    assert last["exercises"][0]["sets"][0]["reps"] == 5


# --- updating a program -----------------------------------------------------

def _day_update(day, day_name=None):
    """Build a WorkoutDayUpdate echoing `day` (optionally renamed), as the edit UI does."""
    return workout_schema.WorkoutDayUpdate(
        day_id=day.day_id,
        day_name=day_name or day.day_name,
        exercises=[workout_schema.ProgramExerciseCreate(exercise_id=pe.exercise_id, sets=pe.sets)
                   for pe in day.exercises],
    )


def test_update_program_keeps_day_ids_and_session_links(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push, pull, legs = _ordered_days(db, program.program_id)
    session = _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push)
    original_ids = [push.day_id, pull.day_id, legs.day_id]

    workout_crud.update_workout_program(
        db, program.program_id,
        workout_schema.WorkoutProgramUpdate(workout_days=[
            _day_update(push, day_name="Push v2"), _day_update(pull), _day_update(legs),
        ]),
    )

    days = _ordered_days(db, program.program_id)
    assert [d.day_id for d in days] == original_ids
    assert days[0].day_name == "Push v2"
    db.refresh(session)
    assert session.day_id == push.day_id

    # The day cycle stays exact: last session was Push, so Pull is next.
    ctx = workout_crud.get_session_context(db, user.id, program.program_id)
    assert ctx["last_session"]["day_name"] == "Push v2"
    assert ctx["suggested_day_id"] == pull.day_id


def test_update_program_replaces_exercises_of_kept_day(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push = _ordered_days(db, program.program_id)[0]
    new_ex = _make_exercise(db, "Incline Press")

    update = _day_update(push)
    update.exercises = [workout_schema.ProgramExerciseCreate(exercise_id=new_ex.exercise_id, sets=5)]
    workout_crud.update_workout_program(
        db, program.program_id, workout_schema.WorkoutProgramUpdate(workout_days=[update]),
    )

    days = _ordered_days(db, program.program_id)
    assert [d.day_id for d in days] == [push.day_id]
    assert [(pe.exercise_id, pe.sets) for pe in days[0].exercises] == [(new_ex.exercise_id, 5)]


def test_update_program_removed_day_detaches_its_sessions(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push, pull, legs = _ordered_days(db, program.program_id)
    session = _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push)

    workout_crud.update_workout_program(
        db, program.program_id,
        workout_schema.WorkoutProgramUpdate(workout_days=[_day_update(pull), _day_update(legs)]),
    )

    assert [d.day_id for d in _ordered_days(db, program.program_id)] == [pull.day_id, legs.day_id]
    db.refresh(session)
    assert session.day_id is None
    # Session history survives untouched.
    assert db.query(workout_model.WorkoutSet).count() == 1


def test_update_program_without_day_ids_recreates_days(db):
    """Legacy payload shape (no day_id): days are recreated and sessions detached."""
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push = _ordered_days(db, program.program_id)[0]
    session = _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push)

    workout_crud.update_workout_program(
        db, program.program_id,
        workout_schema.WorkoutProgramUpdate(workout_days=[
            workout_schema.WorkoutDayUpdate(
                day_name=d.day_name,
                exercises=[workout_schema.ProgramExerciseCreate(exercise_id=pe.exercise_id, sets=pe.sets)
                           for pe in d.exercises],
            )
            for d in _ordered_days(db, program.program_id)
        ]),
    )

    days = _ordered_days(db, program.program_id)
    assert [d.day_name for d in days] == ["Push", "Pull", "Legs"]
    assert push.day_id not in [d.day_id for d in days]
    db.refresh(session)
    assert session.day_id is None


def test_update_program_ignores_foreign_day_id(db):
    """A day_id from another program can't be claimed; it's treated as a new day."""
    user = _make_user(db)
    program_a = _make_ppl_program(db, user.id)
    other_day = _ordered_days(db, program_a.program_id)[0]
    ex = _make_exercise(db, "Row")
    program_b = workout_crud.create_workout_program(
        db, user.id,
        workout_schema.WorkoutProgramCreate(name="Other", workout_days=[
            workout_schema.WorkoutDayCreate(
                day_name="Full body",
                exercises=[workout_schema.ProgramExerciseCreate(exercise_id=ex.exercise_id, sets=3)],
            ),
        ]),
    )

    workout_crud.update_workout_program(
        db, program_b.program_id,
        workout_schema.WorkoutProgramUpdate(workout_days=[
            workout_schema.WorkoutDayUpdate(
                day_id=other_day.day_id, day_name="Stolen",
                exercises=[workout_schema.ProgramExerciseCreate(exercise_id=ex.exercise_id, sets=3)],
            ),
        ]),
    )

    # Program A's day is untouched; B got a fresh day instead.
    db.refresh(other_day)
    assert other_day.program_id == program_a.program_id
    assert other_day.day_name != "Stolen"
    b_days = _ordered_days(db, program_b.program_id)
    assert len(b_days) == 1
    assert b_days[0].day_id != other_day.day_id
    assert b_days[0].day_name == "Stolen"


# --- last performance ------------------------------------------------------

def test_last_performance_returns_latest_sets(db):
    user = _make_user(db)
    program = _make_ppl_program(db, user.id)
    push = _ordered_days(db, program.program_id)[0]
    _insert_session(db, user.id, program.program_id, datetime(2026, 6, 20), push)

    perf = workout_crud.get_last_performance(db, user.id, program.program_id)
    pe_id = push.exercises[0].program_exercise_id
    assert pe_id in perf
    assert perf[pe_id][0]["weight"] == 100
    assert perf[pe_id][0]["reps"] == 5
