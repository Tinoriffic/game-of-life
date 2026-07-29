# Real-DB API test for the Strava router — auth gating, not-configured behavior,
# and the webhook handshake. Mounts just strava_router on a throwaway app.
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import strava_router
from app.dependencies import get_db
from app.auth.auth_utils import generate_tokens
from app.config import Config
from app.models import user_model


@pytest.fixture
def client(db):
    app = FastAPI()
    app.include_router(strava_router.router)
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def auth(db):
    user = user_model.User(id=1, username="tino", email="tino@example.com", timezone="UTC")
    db.add(user)
    db.commit()
    access_token, _ = generate_tokens(user)
    return {"Authorization": f"Bearer {access_token}"}


def test_status_requires_auth(client):
    assert client.get("/strava/status").status_code == 401


def test_status_reports_disconnected(client, db, auth):
    response = client.get("/strava/status", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["connected"] is False
    assert "configured" in body


def test_connect_unavailable_when_not_configured(client, db, auth, monkeypatch):
    monkeypatch.setattr(Config, "STRAVA_CLIENT_ID", None)
    response = client.get("/strava/connect", headers=auth)
    assert response.status_code == 503


def test_connect_returns_authorize_url_when_configured(client, db, auth, monkeypatch):
    monkeypatch.setattr(Config, "STRAVA_CLIENT_ID", "123")
    monkeypatch.setattr(Config, "STRAVA_CLIENT_SECRET", "secret")
    monkeypatch.setattr(Config, "STRAVA_REDIRECT_URI", "https://api.example.com/strava/callback")

    response = client.get("/strava/connect", headers=auth)

    assert response.status_code == 200
    assert "strava.com/oauth/authorize" in response.json()["authorize_url"]


def test_sync_without_a_connection_is_a_clean_400(client, db, auth, monkeypatch):
    monkeypatch.setattr(Config, "STRAVA_CLIENT_ID", "123")
    monkeypatch.setattr(Config, "STRAVA_CLIENT_SECRET", "secret")
    monkeypatch.setattr(Config, "STRAVA_REDIRECT_URI", "https://api.example.com/strava/callback")

    response = client.post("/strava/sync", headers=auth)

    assert response.status_code == 400
    assert "not connected" in response.json()["detail"].lower()


def test_webhook_verification_echoes_challenge(client, monkeypatch):
    monkeypatch.setattr(Config, "STRAVA_WEBHOOK_VERIFY_TOKEN", "tok")
    response = client.get("/strava/webhook", params={
        "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "abc123"})
    assert response.status_code == 200
    assert response.json() == {"hub.challenge": "abc123"}


def test_webhook_verification_rejects_bad_token(client, monkeypatch):
    monkeypatch.setattr(Config, "STRAVA_WEBHOOK_VERIFY_TOKEN", "tok")
    response = client.get("/strava/webhook", params={
        "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "abc123"})
    assert response.status_code == 403


def test_webhook_event_always_acks(client, db):
    response = client.post("/strava/webhook", json={
        "object_type": "activity", "aspect_type": "create",
        "owner_id": 999, "object_id": 1})
    assert response.status_code == 200
    assert response.json() == {"ok": True}
