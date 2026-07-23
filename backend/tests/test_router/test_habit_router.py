# Real-DB API test for PATCH /habits/{id} — the "Edit" button's round trip.
# Same approach as test_user_router: mount just habit_router on a throwaway app
# so no Postgres bootstrap/seed runs at import time.
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import habit_router
from app.dependencies import get_db
from app.auth.auth_utils import generate_tokens
from app.models import user_model
from app.models.habit_model import Bucket, Habit


@pytest.fixture
def client(db):
    app = FastAPI()
    app.include_router(habit_router.router)
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def auth(db):
    user = user_model.User(id=1, username="tino", email="tino@example.com", timezone="UTC",
                           player_xp=0)
    db.add(user)
    db.add(Bucket(id=1, key="strength_training", name="Strength Training", attribute="Strength",
                  detail_kind="volume", base_xp=12, icon="🏋️", is_active=True))
    db.commit()
    access_token, _ = generate_tokens(user)
    return {"Authorization": f"Bearer {access_token}"}


def _habit(db, **overrides):
    fields = dict(user_id=1, bucket_id=1, name="PPL", icon="🏋️", habit_type="standard",
                  cadence_type="weekly", times_per_week=6, status="active")
    fields.update(overrides)
    habit = Habit(**fields)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


def test_patch_lowers_times_per_week(client, db, auth):
    habit = _habit(db)

    response = client.patch(f"/habits/{habit.id}", headers=auth, json={
        "name": "PPL", "cadence_type": "weekly", "times_per_week": 4, "weekdays": None})

    assert response.status_code == 200
    body = response.json()
    assert (body["cadence_type"], body["times_per_week"]) == ("weekly", 4)


def test_patch_switches_to_daily(client, db, auth):
    habit = _habit(db)

    response = client.patch(f"/habits/{habit.id}", headers=auth, json={
        "name": "PPL", "cadence_type": "daily", "times_per_week": None, "weekdays": None})

    assert response.status_code == 200
    assert response.json()["cadence_type"] == "daily"
    assert response.json()["times_per_week"] is None


def test_patch_switches_to_specific_weekdays(client, db, auth):
    habit = _habit(db)

    response = client.patch(f"/habits/{habit.id}", headers=auth, json={
        "name": "PPL", "cadence_type": "weekdays", "times_per_week": None, "weekdays": [0, 2, 4]})

    assert response.status_code == 200
    assert response.json()["weekdays"] == [0, 2, 4]


def test_patch_rejects_out_of_range_times_per_week(client, db, auth):
    habit = _habit(db)

    response = client.patch(f"/habits/{habit.id}", headers=auth, json={
        "cadence_type": "weekly", "times_per_week": 9})

    assert response.status_code == 422


def test_patch_rejects_a_duplicate_name(client, db, auth):
    _habit(db, name="Meditate", cadence_type="daily", times_per_week=None)
    habit = _habit(db)

    response = client.patch(f"/habits/{habit.id}", headers=auth, json={"name": "Meditate"})

    assert response.status_code == 400
    assert "already have an active habit" in response.json()["detail"]


def test_patch_rejects_another_users_habit(client, db, auth):
    other = user_model.User(id=2, username="someone", email="someone@example.com", timezone="UTC")
    db.add(other)
    db.commit()
    habit = _habit(db, user_id=2)

    response = client.patch(f"/habits/{habit.id}", headers=auth, json={"name": "Mine now"})

    assert response.status_code == 400


def test_patch_requires_authentication(client, db, auth):
    habit = _habit(db)
    assert client.patch(f"/habits/{habit.id}", json={"name": "x"}).status_code == 401
