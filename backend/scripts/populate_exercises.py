#!/usr/bin/env python3
"""
Script to populate the database with exercise data
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from exercise_library import init_exercise_library

def populate_exercises():
    """Populate the database with exercise data"""
    db: Session = SessionLocal()
    try:
        print("Populating exercise library...")
        init_exercise_library(db)
        print("Exercise library populated successfully!")
    except Exception as e:
        print(f"Error populating exercises: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_exercises()