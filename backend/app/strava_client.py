"""
Thin Strava API wrapper: OAuth token exchange/refresh + activity fetch. Pure
HTTP, no DB — the CRUD layer owns persistence and mapping. All calls raise
StravaError on a non-2xx so the router can turn it into a clean 4xx/5xx.
"""
import logging
import time
from typing import List, Optional

import httpx

from .config import Config

logger = logging.getLogger(__name__)

STRAVA_OAUTH_URL = "https://www.strava.com/oauth/token"
STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize"
STRAVA_DEAUTHORIZE_URL = "https://www.strava.com/oauth/deauthorize"
STRAVA_API_BASE = "https://www.strava.com/api/v3"

# What counts as a run vs a ride. Runs always import; rides are opt-in per user.
RUN_SPORT_TYPES = {"Run", "TrailRun", "VirtualRun"}
RIDE_SPORT_TYPES = {"Ride", "VirtualRide", "MountainBikeRide", "GravelRide", "EBikeRide"}

# Refresh a bit before the token actually expires so a call never races the clock.
TOKEN_EXPIRY_BUFFER_SECONDS = 120


class StravaError(Exception):
    """Any failed Strava HTTP call."""


def authorize_url(state: str) -> str:
    """The URL to send the user to for the Strava consent screen."""
    from urllib.parse import urlencode
    params = {
        "client_id": Config.STRAVA_CLIENT_ID,
        "redirect_uri": Config.STRAVA_REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "auto",
        "scope": "read,activity:read",
        "state": state,
    }
    return f"{STRAVA_AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Trade an authorization code for tokens + the athlete summary."""
    resp = httpx.post(STRAVA_OAUTH_URL, data={
        "client_id": Config.STRAVA_CLIENT_ID,
        "client_secret": Config.STRAVA_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
    }, timeout=15)
    if resp.status_code != 200:
        raise StravaError(f"Token exchange failed ({resp.status_code}): {resp.text}")
    return resp.json()


def refresh_tokens(refresh_token: str) -> dict:
    """Get a fresh access token from a refresh token."""
    resp = httpx.post(STRAVA_OAUTH_URL, data={
        "client_id": Config.STRAVA_CLIENT_ID,
        "client_secret": Config.STRAVA_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }, timeout=15)
    if resp.status_code != 200:
        raise StravaError(f"Token refresh failed ({resp.status_code}): {resp.text}")
    return resp.json()


def needs_refresh(expires_at: int, now: Optional[int] = None) -> bool:
    now = now if now is not None else int(time.time())
    return expires_at - TOKEN_EXPIRY_BUFFER_SECONDS <= now


def list_activities(access_token: str, after_epoch: Optional[int] = None,
                    per_page: int = 50, page: int = 1) -> List[dict]:
    """Athlete's activities, newest first, optionally only those after a time."""
    params = {"per_page": per_page, "page": page}
    if after_epoch:
        params["after"] = after_epoch
    resp = httpx.get(f"{STRAVA_API_BASE}/athlete/activities",
                     headers={"Authorization": f"Bearer {access_token}"},
                     params=params, timeout=20)
    if resp.status_code != 200:
        raise StravaError(f"Activity fetch failed ({resp.status_code}): {resp.text}")
    return resp.json()


def get_activity(access_token: str, activity_id: int) -> dict:
    """A single activity by id (used by the webhook path)."""
    resp = httpx.get(f"{STRAVA_API_BASE}/activities/{activity_id}",
                     headers={"Authorization": f"Bearer {access_token}"}, timeout=20)
    if resp.status_code != 200:
        raise StravaError(f"Activity {activity_id} fetch failed ({resp.status_code}): {resp.text}")
    return resp.json()


def deauthorize(access_token: str) -> None:
    """Best-effort revoke on Strava's side; failure here is non-fatal to disconnect."""
    try:
        httpx.post(STRAVA_DEAUTHORIZE_URL,
                   headers={"Authorization": f"Bearer {access_token}"}, timeout=15)
    except Exception:
        logger.warning("Strava deauthorize call failed (non-fatal)", exc_info=True)
