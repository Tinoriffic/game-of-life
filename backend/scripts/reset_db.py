from app.database import engine
from app.models import Base
from sqlalchemy import MetaData, text

def reset_database():
    print("  Dropping views...")
    # Drop all views first (they depend on tables)
    with engine.connect() as conn:
        try:
            conn.execute(text("DROP VIEW IF EXISTS user_workout_program_details CASCADE"))
            conn.execute(text("DROP VIEW IF EXISTS workout_progress_view CASCADE"))
            conn.commit()
            print("  Views dropped successfully")
        except Exception as e:
            print(f"  Note: Some views may not exist: {e}")
    
    print("  Dropping and recreating tables...")
    # Now drop all tables and recreate
    meta = MetaData()
    meta.reflect(bind=engine)
    meta.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("  Tables recreated successfully")

if __name__ == "__main__":
    reset_database()