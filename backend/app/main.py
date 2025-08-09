import logging
from fastapi import FastAPI
from dotenv import load_dotenv
load_dotenv()

from .oauth2_config import OAuth2Config
from .cors import setup_cors
from .routers import oauth2_router, user_router, activity_router, skill_router, workout_router, challenge_router
from . import models
from .database import engine

models.Base.metadata.create_all(bind=engine)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

app = FastAPI()

setup_cors(app)

oauth2_config = OAuth2Config()

app.include_router(oauth2_router.router)
app.include_router(activity_router.router)
app.include_router(skill_router.router)
app.include_router(user_router.router)
app.include_router(workout_router.router)
app.include_router(challenge_router.router)


# Example Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to the Game of Life!"}

@app.get("/endpoint")
async def read_root():
    return {"message": "Hello from the backend (FastAPI)!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, query_param: str = None):
    return {"item_id": item_id, "query_param": query_param}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")
