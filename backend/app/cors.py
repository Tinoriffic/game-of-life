from fastapi.middleware.cors import CORSMiddleware
from .config import Config

def setup_cors(app):
    allowed_origins = Config.ALLOWED_ORIGINS
    origins = allowed_origins.split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
    )