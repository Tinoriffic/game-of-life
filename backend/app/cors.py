from fastapi.middleware.cors import CORSMiddleware

def setup_cors(app):
    origins = [
    "http://localhost:3000",  # For local development
    "http://pathquester.app",
    "https://pathquester.app"
]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
    )