import pytest
from dotenv import load_dotenv
from app.models import User, Skill, ActivityStreak
from datetime import date, timedelta

load_dotenv()

@pytest.fixture(scope="module")
def mock_user():
    return User(
        id=1,
        username="testuser",
        email="testuser@example.com",
        first_name="XP",
        last_name="Junkie",
        city="Cyberspace",
        occupation="Data Sorcerer"
    )

@pytest.fixture(scope="module")
def mock_skills():
    base_skills = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom']
    skills = []
    for skill in base_skills:
        if skill == 'Awareness':
            skills.append(Skill(name=skill, xp=40, level=0, daily_xp_earned=0))
        else:
            skills.append(Skill(name=skill, xp=0, level=1, daily_xp_earned=0))
    return skills

@pytest.fixture
def mock_streaks():
    yesterday = date.today() - timedelta(days=1)
    two_days_ago = date.today() - timedelta(days=2)
    return [
        ActivityStreak(user_id=1, activity_type="meditate", current_streak=2, last_activity_date=two_days_ago),
        ActivityStreak(user_id=1, activity_type="weight_tracking", current_streak=3, last_activity_date=yesterday),
        # Add other streaks if necessary
    ]