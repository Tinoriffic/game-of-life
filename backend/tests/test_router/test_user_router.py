# test_user_router.py
#
# Real-DB API test for GET /users/me. Rather than importing app.main (which runs
# create_all + a Postgres bootstrap/seed at import time), we mount just
# user_router on a throwaway FastAPI app and override get_db with the in-memory
# session (conftest `db` fixture). No Postgres, no global app side effects.
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import user_router
from app.dependencies import get_db
from app.auth.auth_utils import generate_tokens
from app.models import user_model


@pytest.fixture
def client(db):
    app = FastAPI()
    app.include_router(user_router.router)
    # get_current_user also depends on get_db, so this one override covers both
    # the endpoint and the auth dependency.
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def _make_user(db):
    user = user_model.User(
        id=1, username="testuser", email="testuser@example.com",
        first_name="XP", last_name="Junkie", city="Cyberspace",
        occupation="Data Sorcerer", timezone="UTC",
    )
    db.add(user)
    db.commit()
    return user


def test_read_current_user_data(client, db):
    user = _make_user(db)
    access_token, _ = generate_tokens(user)

    response = client.get("/users/me", headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "testuser@example.com"
    assert data["skills"] == []


def test_users_me_requires_authentication(client):
    assert client.get("/users/me").status_code == 401


def test_users_me_rejects_invalid_token(client):
    response = client.get("/users/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401
