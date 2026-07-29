"""
Strava connection lifecycle + the activity → habit-log importer.

Import model, kept deliberately simple and aligned with the app's "one check per
habit per day" rule:
  * Runs always import; rides only if the user opts in.
  * Each activity maps to the user's chosen target Cardio habit on the activity's
    local calendar day.
  * The first activity on a day creates the day's log (pays XP exactly like a
    manual log, via the normal engine). Extra activities the same day accumulate
    distance/duration onto that log as data — no double XP, mirroring the manual
    "editing adds data, not XP" rule.
  * A dedup ledger (StravaActivityImport) makes re-syncs and webhook/manual
    overlap idempotent.
"""
import logging
import time
from datetime import datetime
from typing import List, Optional

import jwt
from sqlalchemy.orm import Session

from ..config import Config
from ..models.strava_model import StravaConnection, StravaActivityImport
from ..models.habit_model import Habit, HabitLog
from ..models.user_model import User
from ..schemas import habit_schema
from ..utils.time import utc_now, get_user_today
from .. import strava_client
from . import habit_crud

logger = logging.getLogger(__name__)

METERS_PER_MILE = 1609.34
STATE_TTL_SECONDS = 600          # the connect handshake is a few seconds; 10 min is plenty
DEFAULT_LOOKBACK_DAYS = 30       # first sync (no prior sync time) pulls the last month


# ---------------------------------------------------------------------------
# OAuth state (carries the user id through Strava's redirect, which has no session)
# ---------------------------------------------------------------------------

def sign_state(user_id: int, platform: str = "") -> str:
    payload = {"sub": str(user_id), "purpose": "strava_connect", "platform": platform,
               "exp": int(time.time()) + STATE_TTL_SECONDS}
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def verify_state(token: str) -> tuple[int, str]:
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid or expired Strava link") from exc
    if payload.get("purpose") != "strava_connect":
        raise ValueError("Invalid Strava link")
    return int(payload["sub"]), payload.get("platform") or ""


# ---------------------------------------------------------------------------
# Connection lifecycle
# ---------------------------------------------------------------------------

def get_connection(db: Session, user_id: int) -> Optional[StravaConnection]:
    return db.query(StravaConnection).filter(StravaConnection.user_id == user_id).first()


def _default_target_habit_id(db: Session, user_id: int) -> Optional[int]:
    """Pick the most sensible Cardio habit to receive runs, if one is obvious."""
    candidates = cardio_habits(db, user_id)
    return candidates[0].id if candidates else None


def cardio_habits(db: Session, user_id: int) -> List[Habit]:
    """Active standard habits whose bucket is Cardio — the valid import targets."""
    from ..models.habit_model import Bucket
    return (
        db.query(Habit)
        .join(Bucket, Habit.bucket_id == Bucket.id)
        .filter(Habit.user_id == user_id, Habit.status == "active",
                Habit.habit_type == "standard", Bucket.key == "cardio")
        .order_by(Habit.sort_order, Habit.id)
        .all()
    )


def upsert_connection(db: Session, user_id: int, token_response: dict) -> StravaConnection:
    """Create or refresh the user's Strava link from a token exchange/refresh payload."""
    athlete = token_response.get("athlete") or {}
    athlete_id = athlete.get("id")
    conn = get_connection(db, user_id)

    if conn is None:
        conn = StravaConnection(
            user_id=user_id,
            athlete_id=athlete_id,
            target_habit_id=_default_target_habit_id(db, user_id),
        )
        db.add(conn)
    if athlete_id:
        conn.athlete_id = athlete_id
    conn.access_token = token_response["access_token"]
    conn.refresh_token = token_response["refresh_token"]
    conn.expires_at = token_response["expires_at"]
    conn.scope = token_response.get("scope") or conn.scope
    db.commit()
    db.refresh(conn)
    return conn


def ensure_fresh_token(db: Session, conn: StravaConnection) -> str:
    """Return a valid access token, refreshing + persisting if it's near expiry."""
    if strava_client.needs_refresh(conn.expires_at):
        refreshed = strava_client.refresh_tokens(conn.refresh_token)
        conn.access_token = refreshed["access_token"]
        conn.refresh_token = refreshed["refresh_token"]
        conn.expires_at = refreshed["expires_at"]
        db.commit()
        db.refresh(conn)
    return conn.access_token


def update_settings(db: Session, user_id: int, target_habit_id: Optional[int] = None,
                    import_rides: Optional[bool] = None) -> StravaConnection:
    conn = get_connection(db, user_id)
    if not conn:
        raise ValueError("Strava is not connected")
    if target_habit_id is not None:
        valid_ids = {h.id for h in cardio_habits(db, user_id)}
        if target_habit_id not in valid_ids:
            raise ValueError("Choose one of your active Cardio habits")
        conn.target_habit_id = target_habit_id
    if import_rides is not None:
        conn.import_rides = import_rides
    db.commit()
    db.refresh(conn)
    return conn


def disconnect(db: Session, user_id: int) -> None:
    """Drop the link (imported logs stay — they're real history)."""
    conn = get_connection(db, user_id)
    if not conn:
        return
    try:
        strava_client.deauthorize(conn.access_token)
    finally:
        db.delete(conn)
        db.commit()


# ---------------------------------------------------------------------------
# The importer
# ---------------------------------------------------------------------------

def _allowed_sport(sport_type: str, import_rides: bool) -> bool:
    if sport_type in strava_client.RUN_SPORT_TYPES:
        return True
    return import_rides and sport_type in strava_client.RIDE_SPORT_TYPES


def _local_date(activity: dict):
    """The activity's own local calendar day (Strava gives start_date_local)."""
    raw = activity.get("start_date_local") or activity.get("start_date")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    except ValueError:
        return datetime.strptime(raw[:10], "%Y-%m-%d").date()


def import_activities(db: Session, user: User, activities: List[dict]) -> dict:
    """
    Map a batch of Strava activities onto the target habit. Pure DB work — the
    caller fetches `activities`, so this is unit-testable without HTTP.
    """
    conn = get_connection(db, user.id)
    if not conn:
        raise ValueError("Strava is not connected")
    if not conn.target_habit_id:
        raise ValueError("Pick which Cardio habit your runs should log to first")

    habit = habit_crud.get_user_habit(db, user.id, conn.target_habit_id)
    if not habit or habit.status != "active":
        raise ValueError("Your Strava target habit is missing — pick another")

    user_today = get_user_today(db, user.id)
    already = {
        row.activity_id for row in
        db.query(StravaActivityImport.activity_id)
        .filter(StravaActivityImport.user_id == user.id).all()
    }

    imported = 0
    skipped_duplicate = 0
    days = set()
    total_xp = 0

    # Oldest first so a day's first run creates the log and later ones accumulate.
    for activity in sorted(activities, key=lambda a: a.get("start_date_local") or a.get("start_date") or ""):
        activity_id = activity.get("id")
        if activity_id is None:
            continue
        if activity_id in already:
            skipped_duplicate += 1
            continue
        sport = activity.get("sport_type") or activity.get("type") or ""
        if not _allowed_sport(sport, conn.import_rides):
            continue
        log_date = _local_date(activity)
        if not log_date or log_date > user_today:
            continue

        distance_mi = round((activity.get("distance") or 0) / METERS_PER_MILE, 2)
        duration_min = round((activity.get("moving_time") or 0) / 60, 1)

        existing = db.query(HabitLog).filter(
            HabitLog.habit_id == habit.id, HabitLog.date == log_date).first()
        if existing:
            # Second+ activity that day: accumulate detail only (no re-pay).
            existing.distance = round((existing.distance or 0) + distance_mi, 2)
            existing.duration_minutes = round((existing.duration_minutes or 0) + duration_min, 1)
            db.flush()
            log_id = existing.id
        else:
            result = habit_crud.log_habit(
                db, user, habit.id,
                habit_schema.HabitLogCreate(date=log_date, distance=distance_mi,
                                            duration_minutes=duration_min),
                enforce_window=False, source="strava",
                external_ref=f"strava:{activity_id}",
            )
            log_id = result["log"]["id"]
            total_xp += (result["log"].get("player_xp") or 0) + (result["log"].get("attribute_xp") or 0)

        db.add(StravaActivityImport(
            connection_id=conn.id, user_id=user.id, activity_id=activity_id,
            sport_type=sport, log_date=log_date.isoformat(),
            distance_miles=distance_mi, duration_minutes=duration_min, habit_log_id=log_id,
        ))
        already.add(activity_id)
        imported += 1
        days.add(log_date)

    conn.last_synced_at = utc_now()
    db.commit()

    return {
        "imported": imported,
        "days_logged": len(days),
        "skipped_duplicate": skipped_duplicate,
        "xp_awarded": total_xp,
    }


def sync_now(db: Session, user: User) -> dict:
    """Fetch recent activities from Strava and import them."""
    conn = get_connection(db, user.id)
    if not conn:
        raise ValueError("Strava is not connected")
    access_token = ensure_fresh_token(db, conn)

    if conn.last_synced_at:
        after = int(conn.last_synced_at.timestamp()) - 86400   # 1-day overlap; dedup handles it
    else:
        after = int(time.time()) - DEFAULT_LOOKBACK_DAYS * 86400
    activities = strava_client.list_activities(access_token, after_epoch=after, per_page=100)
    return import_activities(db, user, activities)


def import_one_activity(db: Session, conn: StravaConnection, activity_id: int) -> dict:
    """Webhook path: fetch a single new activity and import it."""
    user = db.query(User).filter(User.id == conn.user_id).first()
    if not user:
        raise ValueError("User not found")
    access_token = ensure_fresh_token(db, conn)
    activity = strava_client.get_activity(access_token, activity_id)
    return import_activities(db, user, [activity])


def status(db: Session, user: User) -> dict:
    """Everything the profile's Strava section renders from."""
    conn = get_connection(db, user.id)
    habits = [{"id": h.id, "name": h.name, "icon": h.icon} for h in cardio_habits(db, user.id)]
    if not conn:
        return {"configured": Config.strava_configured(), "connected": False,
                "cardio_habits": habits}
    return {
        "configured": Config.strava_configured(),
        "connected": True,
        "athlete_id": conn.athlete_id,
        "target_habit_id": conn.target_habit_id,
        "import_rides": conn.import_rides,
        "last_synced_at": conn.last_synced_at.isoformat() if conn.last_synced_at else None,
        "cardio_habits": habits,
    }
