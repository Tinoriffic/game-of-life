# test_workout_crud.py
import pytest
from unittest.mock import create_autospec, MagicMock
from sqlalchemy.orm import Session
from app.crud.workout_crud import create_workout_program, get_user_workout_programs, log_workout_session
from app.models import workout_model, skill_model, activity_model
from app.schemas import workout_schema
from datetime import datetime, timedelta

@pytest.fixture
def mock_session():
    return create_autospec(Session, instance=True)

@pytest.fixture
def mock_workout_program_data():
    return workout_schema.WorkoutProgramCreate(
        name="Test Workout Program",
        workout_days=[
            workout_schema.WorkoutDayCreate(
                day_name="Day 1",
                exercises=[
                    workout_schema.ExerciseCreate(
                        name="Exercise 1",
                        sets=3
                    )
                ]
            )
        ]
    )

@pytest.fixture
def mock_workout_session_data():
    return workout_schema.WorkoutSessionCreate(
        program_id=1,
        date=datetime.now(),
        exercises=[
            workout_schema.WorkoutSessionExerciseCreate(
                program_exercise_id=1,
                sets=[
                    workout_schema.WorkoutSet(
                        set_number=1,
                        performed_reps=10,
                        performed_weight=100
                    )
                ]
            )
        ]
    )

def test_create_workout_program(mock_session, mock_user, mock_workout_program_data):
    # Prepare data for workout program creation
    workout_days = []
    for day in mock_workout_program_data.workout_days:
        exercises = [
            workout_model.WorkoutProgramExercise(
                exercise=workout_model.Exercise(name=e.name),
                sets=e.sets,
                recommended_reps=e.recommended_reps,
                recommended_weight=e.recommended_weight
            )
            for e in day.exercises
        ]
        workout_days.append(workout_model.WorkoutDay(day_name=day.day_name, exercises=exercises))

    mock_new_program = workout_model.WorkoutProgram(
        user_id=mock_user.id,
        name=mock_workout_program_data.name,
        workout_days=workout_days
    )
    mock_session.add(mock_new_program)
    mock_session.commit()
    mock_session.refresh(mock_new_program)

    assert mock_new_program.user_id == mock_user.id
    assert mock_new_program.name == mock_workout_program_data.name
    assert len(mock_new_program.workout_days) == len(mock_workout_program_data.workout_days)
    for mock_day, day in zip(mock_new_program.workout_days, mock_workout_program_data.workout_days):
        assert mock_day.day_name == day.day_name
        assert len(mock_day.exercises) == len(day.exercises)

def test_get_user_workout_programs(mock_session, mock_user):

    mock_session.query.return_value.filter.return_value = [workout_model.WorkoutProgram(user_id=mock_user.id)]
    programs = get_user_workout_programs(mock_session, mock_user.id)

    assert programs is not None
    assert all(program.user_id == mock_user.id for program in programs)

def test_log_workout_session(mock_session, mock_user, mock_workout_session_data):
    mock_new_session = workout_model.WorkoutSession(
        user_id=mock_user.id,
        program_id=mock_workout_session_data.program_id,
        session_date=mock_workout_session_data.date
    )

    # Mock the session exercises
    for session_exercise in mock_workout_session_data.exercises:
        for set_detail in session_exercise.sets:
            mock_session_exercise = workout_model.WorkoutSessionExercise(
                session=mock_new_session,
                program_exercise_id=session_exercise.program_exercise_id,
                set_number=set_detail.set_number,
                performed_reps=set_detail.performed_reps,
                performed_weight=set_detail.performed_weight
            )
            mock_session.add(mock_session_exercise)

    mock_session.add(mock_new_session)
    mock_session.commit()
    mock_session.refresh(mock_new_session)

    assert mock_new_session.user_id == mock_user.id
    assert mock_new_session.program_id == mock_workout_session_data.program_id
    assert mock_new_session.session_date == mock_workout_session_data.date
    assert len(mock_new_session.exercises) == sum(len(ex.sets) for ex in mock_workout_session_data.exercises)
