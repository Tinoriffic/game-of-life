from fastapi.middleware.cors import CORSMiddleware
from .config import Config

def setup_cors(app):
    allowed_origins = Config.ALLOWED_ORIGINS
    print("allowed_origins env variable: " + allowed_origins) # DEBUGGING PURPOSES
    origins = allowed_origins.split(",")
    print("List of origins: ", origins) # DEBUGGING PURPOSES

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
    )