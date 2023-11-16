from fastapi import FastAPI
from .cors import setup_cors
from .routers import user_router, activity_router, skill_router, workout_router
from . import models
from .database import engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

setup_cors(app)

app.include_router(activity_router.router)
app.include_router(skill_router.router)
app.include_router(user_router.router)
app.include_router(workout_router.router)


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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
