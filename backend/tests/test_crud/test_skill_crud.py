# test_skill_crud.py
import pytest
from unittest.mock import create_autospec
from sqlalchemy.orm import Session
from app.crud.skill_crud import get_user_skills
from app.skill_manager import update_skill_xp

@pytest.fixture
def mock_session():
    return create_autospec(Session, instance=True)

def test_get_user_skills(mock_session, mock_user, mock_skills):
    mock_session.query.return_value.filter.return_value = mock_skills
    skills = get_user_skills(mock_session, mock_user.id)

    assert skills is not None
    assert len(skills) == len(mock_skills)
    for skill in skills:
        assert skill in mock_skills
