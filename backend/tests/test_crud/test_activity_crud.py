import pytest
from unittest.mock import create_autospec
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app.crud.activity_crud import get_user_activity_streaks, log_activity, log_weight_entry, map_activity_to_skill
from app.models import activity_model
from app.schemas import activity_schema

@pytest.fixture
def mock_session():
    # Create a mock session object
    return create_autospec(Session, instance=True)

@pytest.fixture
def mock_activity_data():
    # Mock data for testing log_activity
    return activity_schema.ActivityLog(
        activity_type="meditate",
        duration=30,
        daily_xp_earned=0
    )

@pytest.fixture
def mock_weight_entry():
    # Mock data for testing log_weight_entry
    return activity_schema.WeightEntry(
        weight=170,
        date=datetime.now().date(),
        weight_goal=180
    )

def test_get_user_activity_streaks(mock_session, mock_user):
    mock_session.query.return_value.filter.return_value = [activity_model.ActivityStreak(user_id=mock_user.id)]
    streaks = get_user_activity_streaks(mock_session, mock_user.id)
    assert streaks is not None

def test_log_activity(mock_session, mock_user, mock_activity_data, mock_skills, mock_streaks):
    # Test setup
    skill_name = map_activity_to_skill(mock_activity_data.activity_type)
    mock_skill = next((skill for skill in mock_skills if skill.name == skill_name), None)
    mock_session.query.return_value.filter.return_value.first.return_value = mock_skill

    streak = next((streak for streak in mock_streaks if streak.activity_type == mock_activity_data.activity_type), None)
    mock_session.query.return_value.filter_by.return_value.first.return_value = streak

    activity = log_activity(mock_session, mock_user.id, mock_activity_data)

    # Assertions for activity
    assert activity.user_id == mock_user.id
    assert activity.activity_type == mock_activity_data.activity_type

    # Since it's the first time logging this activity, a new streak should be started
    assert streak.current_streak == 1
    assert streak.last_activity_date == date.today()

def test_log_weight_entry(mock_session, mock_user, mock_weight_entry, mock_skills, mock_streaks):
    # Test setup
    mock_session.query.return_value.filter.return_value.first.return_value = mock_skills[4]  # 'Strength' skill
    streak = next((streak for streak in mock_streaks if streak.activity_type == "weight_tracking"), None)
    mock_session.query.return_value.filter_by.return_value.first.return_value = streak

    # Call the log_weight_entry function
    weight_entry = log_weight_entry(mock_session, mock_user.id, mock_weight_entry)

    # Assertions for weight entry
    assert weight_entry.user_id == mock_user.id
    assert weight_entry.weight == mock_weight_entry.weight

    # Assertions for streak:
    assert streak.current_streak == 4

    assert streak.last_activity_date == date.today()
