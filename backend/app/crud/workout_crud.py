from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from ..schemas import workout_schema
from ..models import workout_model, skill_model
from ..xp_calculator import calculate_workout_xp
from ..skill_manager import update_skill_xp
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

def get_workout_program(db: Session, program_id: int):
    """
    Retrieve a workout program
    """
    return db.query(workout_model.WorkoutProgram).filter(workout_model.WorkoutProgram.program_id == program_id).first()
    
def get_user_workout_programs(db: Session, user_id: int):
    """
    Retrieve all of a user's workout programs
    """
    return db.query(workout_model.WorkoutProgram).options(
        joinedload(workout_model.WorkoutProgram.workout_days)).filter(
            workout_model.WorkoutProgram.user_id == user_id).all()

def get_workout_day_by_name(db: Session, program_id: int, day_name: str):
    """
    Check if a specific day exists in a workout program.
    """
    return db.query(workout_model.WorkoutDay)\
        .filter(workout_model.WorkoutDay.program_id == program_id, workout_model.WorkoutDay.day_name == day_name)\
        .first()

def get_exercises_for_specific_day(db: Session, program_id: int, day_name: str):
    """
    Helper function that retrieves all exercises for a specific workout day of a program
    Useful for building the request body when logging a workout entry
    """
    return db.query(workout_model.WorkoutProgramExercise, workout_model.Exercise.name.label("exercise_name")).join(
        workout_model.WorkoutDay).join(workout_model.Exercise).filter(workout_model.WorkoutDay.program_id == program_id, workout_model.WorkoutDay.day_name == day_name).all()

def create_workout_program(db: Session, user_id: int, program: workout_schema.WorkoutProgramCreate):
    """
    Create a new workout program.
    """
    # Check if the program name already exists for the user
    existing_program = db.query(workout_model.WorkoutProgram).filter(
        workout_model.WorkoutProgram.user_id == user_id, 
        workout_model.WorkoutProgram.name == program.name
    ).first()

    if existing_program:
        raise ValueError("A program with this name already exists.")
    
    new_program = workout_model.WorkoutProgram(
        user_id=user_id,
        name=program.name
    )
    db.add(new_program)
    db.commit()
    db.refresh(new_program)

    # Iterate over each day in the program
    for day in program.workout_days:
        new_day = workout_model.WorkoutDay(
            program_id=new_program.program_id,
            day_name=day.day_name
        )
        db.add(new_day)
        db.flush()

        # Iterate over each exercise in the day
        for exercise in day.exercises:
            exercise_model = get_or_create_exercise(db, exercise.name)
            new_program_exercise = workout_model.WorkoutProgramExercise(
                day_id=new_day.day_id,
                exercise_id=exercise_model.exercise_id,
                sets=exercise.sets,
                recommended_reps=exercise.recommended_reps,
                recommended_weight=exercise.recommended_weight
            )
            db.add(new_program_exercise)
            db.flush()
            db.refresh(new_program_exercise)
        
    db.commit()

    new_program = db.query(workout_model.WorkoutProgram).options(
        joinedload(workout_model.WorkoutProgram.workout_days)
        .joinedload(workout_model.WorkoutDay.exercises)).filter(
            workout_model.WorkoutProgram.program_id == new_program.program_id).first()

    return new_program

def log_workout_session(db: Session, session_data: workout_schema.WorkoutSessionCreate, user_id: int):
    new_session = workout_model.WorkoutSession(user_id=user_id, program_id=session_data.program_id, session_date=session_data.date)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    for exercise in session_data.exercises:
        # Get the highest set number for this exercise in this session so far
        max_set_number = db.query(func.max(workout_model.WorkoutSessionExercise.set_number)).filter(
            workout_model.WorkoutSessionExercise.session_id == new_session.session_id,
            workout_model.WorkoutSessionExercise.program_exercise_id == exercise.program_exercise_id
        ).scalar() or 0

        # Iterate through each set of the exercise
        for set_number, set in enumerate(exercise.sets, start=max_set_number + 1):
            new_set = workout_model.WorkoutSessionExercise(
                session_id=new_session.session_id,
                program_exercise_id=exercise.program_exercise_id,
                set_number=set_number,
                performed_reps=set.performed_reps,
                performed_weight=set.performed_weight)
            db.add(new_set)

    strength_skill = db.query(skill_model.Skill).filter(skill_model.Skill.user_id == user_id, skill_model.Skill.name == "Strength").first()

    # Reset daily XP if it's a new day
    if strength_skill and strength_skill.last_updated.date() < datetime.utcnow().date():
        strength_skill.daily_xp_earned = 0

    # Update Skill XP
    workout_data = get_user_workout_progress(db, user_id)
    xp_to_add = calculate_workout_xp(strength_skill.daily_xp_earned, workout_data)
    update_skill_xp(db, user_id, "Strength", xp_to_add)

    db.commit()
    return new_session

def get_workout_program_details(db: Session, program_id: int) -> List[Dict]:
    result = db.execute(
        text("""
        SELECT user_id, program_name, day_name, exercise_name, program_exercise_id, sets
        FROM user_workout_program_details
        WHERE program_id = :program_id
        """),
        {"program_id": program_id}
    ).fetchall()

    # Convert result to a list of dicts
    return [row._asdict() for row in result]

def get_workout_sessions(db: Session, user_id: int):
    return db.query(workout_model.WorkoutSessionExercise).join(
        workout_model.WorkoutSession, workout_model.WorkoutSession.session_id == workout_model.WorkoutSessionExercise.session_id).filter(
            workout_model.WorkoutSession.user_id == user_id).all()

def get_or_create_exercise(db: Session, exercise_name: str):
    exercise = db.query(workout_model.Exercise).filter(workout_model.Exercise.name == exercise_name).first()
    if not exercise:
        exercise = workout_model.Exercise(name=exercise_name)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
    return exercise

def get_user_workout_progress(db: Session, user_id: int, time_frame: int = 7) -> List[Tuple]:
    """
    Fetch workout progress data for a user over a specified time frame.
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=time_frame)
    
    return db.execute(
        text("""
        SELECT exercise_name, session_date, SUM(volume) as total_volume
        FROM workout_progress_view
        WHERE user_id = :user_id AND session_date BETWEEN :start_date AND :end_date
        GROUP BY exercise_name, session_date
        ORDER BY exercise_name, session_date
        """),
        {"user_id": user_id, "start_date": start_date, "end_date": end_date}
    ).fetchall()

def delete_workout_program(db: Session, program_id: int):
    """
    Delete a workout program based on the program ID.
    """
    # Fetch IDs for related workout session exercises
    session_exercise_ids = db.query(workout_model.WorkoutProgramExercise.program_exercise_id)\
        .join(workout_model.WorkoutDay, workout_model.WorkoutDay.day_id == workout_model.WorkoutProgramExercise.day_id)\
        .filter(workout_model.WorkoutDay.program_id == program_id).all()
    session_exercise_ids = [id[0] for id in session_exercise_ids]

    # Delete related workout session exercises
    if session_exercise_ids:
        db.query(workout_model.WorkoutSessionExercise)\
            .filter(workout_model.WorkoutSessionExercise.program_exercise_id.in_(session_exercise_ids))\
            .delete(synchronize_session='fetch')

    # Fetch IDs for related workout program exercises
    program_exercise_ids = db.query(workout_model.WorkoutProgramExercise.program_exercise_id)\
        .join(workout_model.WorkoutDay, workout_model.WorkoutDay.day_id == workout_model.WorkoutProgramExercise.day_id)\
        .filter(workout_model.WorkoutDay.program_id == program_id).all()
    program_exercise_ids = [id[0] for id in program_exercise_ids]

    # Delete workout program exercises
    if program_exercise_ids:
        db.query(workout_model.WorkoutProgramExercise)\
            .filter(workout_model.WorkoutProgramExercise.program_exercise_id.in_(program_exercise_ids))\
            .delete(synchronize_session='fetch')

    # Delete workout days
    db.query(workout_model.WorkoutDay).filter(workout_model.WorkoutDay.program_id == program_id).delete(synchronize_session='fetch')

    # Finally, delete the workout program
    db.query(workout_model.WorkoutProgram).filter(workout_model.WorkoutProgram.program_id == program_id).delete(synchronize_session='fetch')
    db.commit()
