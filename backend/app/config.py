from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    DATABASE_URL = os.getenv("DATABASE_URL")
    FRONTEND_URL = os.getenv("FRONTEND_URL")
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    REDIRECT_URI = os.getenv("REDIRECT_URI")
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Strava import (optional feature; endpoints report unavailable if unset).
    # STRAVA_REDIRECT_URI is the backend's own /strava/callback (registered as an
    # Authorization Callback Domain in the Strava API app).
    STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
    STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
    STRAVA_REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")
    STRAVA_WEBHOOK_VERIFY_TOKEN = os.getenv("STRAVA_WEBHOOK_VERIFY_TOKEN", "mev2-strava")

    @classmethod
    def strava_configured(cls) -> bool:
        return bool(cls.STRAVA_CLIENT_ID and cls.STRAVA_CLIENT_SECRET and cls.STRAVA_REDIRECT_URI)
