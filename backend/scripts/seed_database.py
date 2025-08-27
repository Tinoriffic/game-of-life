#!/usr/bin/env python3
"""
Master script to seed the entire database with initial data
Usage: python scripts/seed_database.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reset_db import reset_database
from populate_exercises import populate_exercises
from populate_challenges import populate_challenges
from create_views import create_views

def seed_database():
    """Reset and seed the entire database"""
    print("Starting database seeding process...")
    print("=" * 50)
    
    # Step 1: Reset database
    print("1. Resetting database...")
    reset_database()
    print("Database reset complete!")
    print()
    
    # Step 2: Populate exercises
    print("2. Populating exercises...")
    populate_exercises()
    print()
    
    # Step 3: Populate challenges and badges
    print("3. Populating challenges and badges...")
    populate_challenges()
    print()
    
    # Step 4: Create database views
    print("4. Creating database views...")
    create_views()
    print()
    
    print("=" * 50)
    print("Database seeding complete!")
    print("Your database now contains:")
    print("  - Exercise library with 80+ exercises")
    print("  - 4 challenge types with badges")
    print("  - All lookup tables populated")
    print("  - Database views recreated")

if __name__ == "__main__":
    seed_database()