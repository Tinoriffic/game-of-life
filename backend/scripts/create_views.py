#!/usr/bin/env python3
"""
Script to create database views
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

def create_views():
    """Create database views"""
    print("Creating database views...")
    
    views = [
        {
            'name': 'user_workout_program_details',
            'sql': '''
                CREATE OR REPLACE VIEW user_workout_program_details AS
                SELECT 
                    wp.program_id,
                    wp.user_id,
                    wp.name AS program_name,
                    wd.day_id,
                    wd.day_name,
                    pe.program_exercise_id,
                    e.exercise_id,
                    e.name AS exercise_name,
                    pe.sets,
                    pe.recommended_reps,
                    pe.recommended_weight
                FROM 
                    workout_programs wp
                JOIN 
                    workout_days wd ON wp.program_id = wd.program_id
                JOIN 
                    program_exercises pe ON wd.day_id = pe.day_id
                JOIN 
                    exercises e ON pe.exercise_id = e.exercise_id;
            '''
        },
        {
            'name': 'workout_progress_view',
            'sql': '''
                CREATE OR REPLACE VIEW workout_progress_view AS
                SELECT 
                    ws.user_id,
                    ws.session_id,
                    ws.session_date,
                    se.session_exercise_id,
                    e.exercise_id,
                    e.name AS exercise_name,
                    wset.set_id,
                    wset.set_number,
                    wset.performed_weight,
                    wset.performed_reps,
                    (wset.performed_weight * wset.performed_reps) AS set_volume,
                    se.total_volume,
                    se.total_intensity_score
                FROM 
                    workout_sessions ws
                JOIN 
                    session_exercises se ON ws.session_id = se.session_id
                JOIN 
                    exercises e ON se.exercise_id = e.exercise_id
                JOIN 
                    workout_sets wset ON se.session_exercise_id = wset.session_exercise_id;
            '''
        }
    ]
    
    try:
        with engine.connect() as conn:
            for view in views:
                conn.execute(text(view['sql']))
                print(f"  Created view: {view['name']}")
            conn.commit()
        print("Database views created successfully!")
        
    except Exception as e:
        print(f"Error creating views: {str(e)}")

if __name__ == "__main__":
    create_views()