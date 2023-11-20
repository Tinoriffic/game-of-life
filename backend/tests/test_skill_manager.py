import pytest
from unittest.mock import patch, create_autospec
from sqlalchemy.orm import Session
from app.skill_manager import update_skill_xp, calculate_required_xp
from app.models import Skill

def test_calculate_required_xp():
    assert calculate_required_xp(1) == 100  # Basic case
    assert calculate_required_xp(2) == int(100 * (2 ** 1.5))  # Next level

# Mock setup for Skill model and Session
@pytest.fixture
def mock_skill():
    return Skill(name="TestSkill", xp=50, level=1, daily_xp_earned=0)

@pytest.fixture
def mock_session(mock_skill):
    session = create_autospec(Session, instance=True)
    session.query.return_value.filter.return_value.first.return_value = mock_skill
    return session

# Test update_skill_xp function
def test_update_skill_xp(mock_session):
    with patch('app.skill_manager.Session', return_value=mock_session):
        skill = mock_session.query(Skill).filter().first()
        assert skill.level == 1

        update_skill_xp(mock_session, 1, "TestSkill", 50)
        skill = mock_session.query(Skill).filter().first()
        assert skill.level == 2
        assert skill.xp == 0  # New total XP should be 0 since 100 XP is a level up (at level 1)
        assert skill.daily_xp_earned == 50
        
        update_skill_xp(mock_session, 1, "TestSkill", 20)
        skill = mock_session.query(Skill).filter().first()
        assert skill.xp == 20
        assert skill.level == 2
