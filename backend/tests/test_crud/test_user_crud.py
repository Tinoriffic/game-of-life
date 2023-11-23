# test_user_crud.py
import pytest
from unittest.mock import create_autospec
from sqlalchemy.orm import Session
from app.crud.user_crud import create_user, get_user
from app.schemas import user_schema

@pytest.fixture
def mock_session():
    return create_autospec(Session, instance=True)

@pytest.fixture
def mock_user_create_data():
    return user_schema.UserCreate(
        username="newuser",
        password="password",
        email="newuser@example.com",
        first_name="New",
        last_name="User",
        city="New City",
        occupation="New Occupation"
    )

def test_create_user(mock_session, mock_user_create_data):
    new_user = create_user(mock_session, mock_user_create_data)
    mock_session.commit.assert_called()
    assert new_user.username == mock_user_create_data.username
    assert new_user.email == mock_user_create_data.email

def test_get_user(mock_session, mock_user):
    mock_session.query.return_value.filter.return_value.first.return_value = mock_user
    user = get_user(mock_session, mock_user.id)
    assert user is not None
    assert user.id == mock_user.id
    assert user.username == mock_user.username
