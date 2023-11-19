import pytest
from unittest.mock import Mock, patch
from app.skill_manager import update_skill_xp, calculate_required_xp
from app.models import Skill

# Mock the Skill model and database session
class MockSkill(Skill):
    def __init__(self, name, xp, level, daily_xp_earned):
        self.name = name
        self.xp = xp
        self.level = level
        self.daily_xp_earned = daily_xp_earned

@pytest.fixture
def mock_db_session():
    # Mock session class
    class MockSession:
        def query(self, model):
            return self
        def filter(self, *args, **kwargs):
            return self
        def first(self):
            return MockSkill("TestSkill", 100, 1, 0)
        def commit(self):
            pass

    return MockSession()

# Test calculate_required_xp function
def test_calculate_required_xp():
    assert calculate_required_xp(1) == 100  # Basic case
    assert calculate_required_xp(2) == int(100 * (2 ** 1.5))  # Next level

# Test update_skill_xp function
def test_update_skill_xp(mock_db_session):
    with patch('your_project.skill_manager.db', mock_db_session):
        skill = update_skill_xp(mock_db_session, 1, "TestSkill", 50)
        assert skill.xp == 150  # New total XP
        assert skill.daily_xp_earned == 50  # XP earned for the day
