"""
Strava import: connect a Strava account, sync runs/rides into a Cardio habit,
and receive Strava webhooks for automatic import. The feature is opt-in and
only available when the server has STRAVA_* configured.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..config import Config
from ..models import user_model
from ..schemas import strava_schema
from ..crud import strava_crud
from ..auth import auth_utils
from ..dependencies import get_db
from .. import strava_client

router = APIRouter(prefix="/strava", tags=["strava"])
logger = logging.getLogger(__name__)

IOS_PLATFORM = "ios"


def _require_configured():
    if not Config.strava_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Strava import isn't configured on this server")


def _bad_request(e: ValueError):
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/status")
async def strava_status(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    return strava_crud.status(db, current_user)


@router.get("/connect")
async def strava_connect(
    platform: str | None = Query(None),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    """Returns the Strava consent URL; the client navigates (web) or opens the
    system browser (iOS) to it."""
    _require_configured()
    state = strava_crud.sign_state(current_user.id, platform or "")
    return {"authorize_url": strava_client.authorize_url(state)}


@router.get("/callback")
async def strava_callback(
    code: str | None = Query(None),
    state: str = Query(""),
    error: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """Strava redirects here after consent (no user session — the signed `state`
    carries the user id). Exchanges the code, links the account, and bounces
    back to the profile."""
    _require_configured()
    try:
        user_id, platform = strava_crud.verify_state(state)
    except ValueError:
        return RedirectResponse(url=f"{Config.FRONTEND_URL}/profile?strava=error")

    base = "mev2://" if platform == IOS_PLATFORM else f"{Config.FRONTEND_URL}/"
    if error or not code:
        return RedirectResponse(url=f"{base}profile?strava=denied")
    try:
        token_response = strava_client.exchange_code(code)
        strava_crud.upsert_connection(db, user_id, token_response)
    except Exception:
        logger.exception("Strava connect failed")
        return RedirectResponse(url=f"{base}profile?strava=error")
    return RedirectResponse(url=f"{base}profile?strava=connected")


@router.post("/sync")
async def strava_sync(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    _require_configured()
    try:
        return strava_crud.sync_now(db, current_user)
    except ValueError as e:
        raise _bad_request(e)
    except strava_client.StravaError:
        logger.exception("Strava sync failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="Couldn't reach Strava — try again in a bit")


@router.patch("/settings")
async def strava_settings(
    payload: strava_schema.StravaSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    try:
        strava_crud.update_settings(db, current_user.id,
                                    target_habit_id=payload.target_habit_id,
                                    import_rides=payload.import_rides)
        return strava_crud.status(db, current_user)
    except ValueError as e:
        raise _bad_request(e)


@router.post("/disconnect")
async def strava_disconnect(
    db: Session = Depends(get_db),
    current_user: user_model.User = Depends(auth_utils.get_current_user),
):
    strava_crud.disconnect(db, current_user.id)
    return {"connected": False}


# --- Webhook (automatic import; requires a one-time push subscription) ---------

@router.get("/webhook")
async def strava_webhook_verify(request: Request):
    """Strava's subscription handshake: echo hub.challenge when the token matches."""
    params = request.query_params
    if (params.get("hub.mode") == "subscribe"
            and params.get("hub.verify_token") == Config.STRAVA_WEBHOOK_VERIFY_TOKEN):
        return {"hub.challenge": params.get("hub.challenge")}
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verification failed")


@router.post("/webhook")
async def strava_webhook_event(request: Request, db: Session = Depends(get_db)):
    """Receive an activity event and import it. Always 200 fast so Strava doesn't
    retry; the actual work is best-effort."""
    try:
        event = await request.json()
    except Exception:
        return {"ok": True}

    if event.get("object_type") == "activity" and event.get("aspect_type") == "create":
        owner_id = event.get("owner_id")
        activity_id = event.get("object_id")
        conn = (db.query(strava_crud.StravaConnection)
                .filter(strava_crud.StravaConnection.athlete_id == owner_id).first())
        if conn and conn.target_habit_id and activity_id:
            try:
                strava_crud.import_one_activity(db, conn, activity_id)
            except Exception:
                logger.exception("Strava webhook import failed (non-fatal)")
    return {"ok": True}
