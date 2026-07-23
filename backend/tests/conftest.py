import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base
import app.models  # noqa: F401 - registers every model on Base.metadata for create_all
from app.models import User, Skill, ActivityStreak
from datetime import date, timedelta

load_dotenv()


@pytest.fixture
def db():
    """A fresh in-memory SQLite database session per test.

    The CRUD under test is query-heavy (joins, ordering, streak math), so we run
    against real tables rather than a mocked Session.

    StaticPool keeps every checkout on one connection: an in-memory SQLite DB
    lives *in* its connection, so without it a commit inside TestClient's worker
    thread would reconnect to an empty database.
    """
    engine = create_engine("sqlite:///:memory:", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

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
    base_skills = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom', 'Resilience']
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