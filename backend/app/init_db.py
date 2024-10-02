from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .database import Base
from .exercise_library import init_exercise_library
from .models import workout_model

# Use your actual database URL
DATABASE_URL = "your_database_url_here"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def wipe_workout_data(db):
    try:
        # Delete data from tables in reverse order of dependencies
        db.query(workout_model.WorkoutSet).delete()
        db.query(workout_model.SessionExercise).delete()
        db.query(workout_model.WorkoutSession).delete()
        db.query(workout_model.ProgramExercise).delete()
        db.query(workout_model.WorkoutDay).delete()
        db.query(workout_model.WorkoutProgram).delete()
        
        # Delete data from exercise-related tables
        db.query(workout_model.Exercise).delete()
        db.query(workout_model.ExerciseCategory).delete()
        db.query(workout_model.ExerciseMuscleGroup).delete()
        db.query(workout_model.ExerciseEquipment).delete()
        db.query(workout_model.ExerciseDifficultyLevel).delete()
        db.query(workout_model.ExerciseType).delete()

        db.commit()
        print("All workout-related data has been wiped from the database.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred while wiping workout data: {str(e)}")

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_exercise_library(db)
    db.close()

if __name__ == "__main__":
    init_db()