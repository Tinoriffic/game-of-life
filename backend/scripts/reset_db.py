from app.database import engine
from app.models import Base
from sqlalchemy import MetaData

def reset_database():
    meta = MetaData()
    meta.reflect(bind=engine)
    meta.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    reset_database()