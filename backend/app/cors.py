from fastapi.middleware.cors import CORSMiddleware

def setup_cors(app):
    origins = [
    "http://localhost:3000",  # The origin of your React app during local development
    "http://13.59.112.236", # Elastic IP TODO: Replace w/ domain name later
]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
    )