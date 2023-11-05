from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str

    class Config:
        from_attributes = True

# Schema for internal use, including hashed password
class UserInDB(User):
    hashed_password: str