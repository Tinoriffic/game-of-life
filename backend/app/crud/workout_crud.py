from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from ..schemas import workout_schema
from ..models import workout_model, skill_model, activity_model
from ..xp_calculator import calculate_workout_xp
from ..skill_manager import update_skill_xp
from ..crud.activity_crud import update_activity_streak
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional

def get_workout_program_by_id(db: Session, program_id: int):
    """
    Retrieve a workout program by program ID
    """
    return db.query(workout_model.WorkoutProgram).filter(workout_model.WorkoutProgram.program_id == program_id).first()

def get_workout_program_by_user_and_id(db: Session, program_id: int, user_id: int):
    """
    Retrieve a workout program by program and user ID
    """
    return db.query(workout_model.WorkoutProgram).filter(
        workout_model.WorkoutProgram.program_id == program_id,
        workout_model.WorkoutProgram.user_id == user_id
    ).first()

def get_user_workout_programs(db: Session, user_id: int, include_archived: bool = False) -> Tuple[List[workout_model.WorkoutProgram], bool]:
    """
    Retrieve all of a user's workout programs
    """
    query = db.query(workout_model.WorkoutProgram).filter(workout_model.WorkoutProgram.user_id == user_id).options(
        joinedload(workout_model.WorkoutProgram.workout_days)
        .joinedload(workout_model.WorkoutDay.exercises)
    ).order_by(workout_model.WorkoutProgram.created_at.desc())

    if not include_archived:
        query = query.filter(workout_model.WorkoutProgram.status == 'active')
    
    programs = query.all()
    
    has_archived = db.query(workout_model.WorkoutProgram).filter(
        workout_model.WorkoutProgram.user_id == user_id,
        workout_model.WorkoutProgram.status == 'archived'
    ).first() is not None

    return programs, has_archived

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
    return db.query(workout_model.ProgramExercise, workout_model.Exercise).\
        join(workout_model.WorkoutDay, workout_model.ProgramExercise.day_id == workout_model.WorkoutDay.day_id).\
        join(workout_model.Exercise, workout_model.ProgramExercise.exercise_id == workout_model.Exercise.exercise_id).\
        filter(
            workout_model.WorkoutDay.program_id == program_id,
            workout_model.WorkoutDay.day_name == day_name
        ).all()

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
        name=program.name,
        status='active',
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(new_program)
    db.flush()

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
            
            new_program_exercise = workout_model.ProgramExercise(
                day_id=new_day.day_id,
                exercise_id=exercise.exercise_id,
                sets=exercise.sets,
                recommended_reps=exercise.recommended_reps,
                recommended_weight=exercise.recommended_weight
            )
            db.add(new_program_exercise)
            
    db.commit()
    db.refresh(new_program)

    new_program = db.query(workout_model.WorkoutProgram).options(
        joinedload(workout_model.WorkoutProgram.workout_days).joinedload(
            workout_model.WorkoutDay.exercises)
    ).filter(
        workout_model.WorkoutProgram.program_id == new_program.program_id
    ).first()

    return new_program

def create_user_exercise(db: Session, user_id: int, exercise: workout_schema.ExerciseCreate):
    new_exercise = workout_model.Exercise(
        name=exercise.name,
        description=exercise.description,
        instructions=exercise.instructions,
        primary_muscles=exercise.primary_muscles,
        secondary_muscles=exercise.secondary_muscles,
        category_id=exercise.category_id,
        muscle_group_id=exercise.muscle_group_id,
        equipment_id=exercise.equipment_id,
        difficulty_level_id=exercise.difficulty_level_id,
        exercise_type_id=exercise.exercise_type_id,
        is_global=exercise.is_global,
        user_id=user_id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(new_exercise)
    db.commit()
    db.refresh(new_exercise)
    return new_exercise

def edit_exercise(db: Session, exercise_id: int, user_id: int, exercise_update: workout_schema.ExerciseUpdate):
    # First, check if the exercise exists and belongs to the user
    exercise = db.query(workout_model.Exercise).filter(
        workout_model.Exercise.exercise_id == exercise_id,
        workout_model.Exercise.user_id == user_id
    ).first()

    if not exercise:
        return None

    # Update the exercise fields
    update_data = exercise_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(exercise, key, value)

    exercise.updated_at = datetime.now()
    db.commit()
    db.refresh(exercise)
    return exercise

def delete_exercise(db: Session, exercise_id: int, user_id: int):
    exercise = db.query(workout_model.Exercise).filter(
        workout_model.Exercise.exercise_id == exercise_id,
        workout_model.Exercise.user_id == user_id,
        # TODO: only user-created exercises can be deleted but, users should have an option to publish their exercises to global library
        workout_model.Exercise.is_global == False
    ).first()

    if not exercise:
        return None

    # Check if the exercise is used in any workout programs
    program_exercise = db.query(workout_model.ProgramExercise).filter(
        workout_model.ProgramExercise.exercise_id == exercise_id
    ).first()

    if program_exercise:
        raise ValueError("Cannot delete exercise as it is used in one or more workout programs!")

    db.delete(exercise)
    db.commit()
    return exercise

def get_exercises(db: Session, user_id: Optional[int] = None):
    query = db.query(workout_model.Exercise).filter(
        workout_model.Exercise.is_global == True
    )
    if user_id is not None:
        query = query.union(
            db.query(workout_model.Exercise).filter(
                workout_model.Exercise.user_id == user_id
            )
        )
    return query.all()

def log_workout_session(db: Session, session_data: workout_schema.WorkoutSessionCreate, user_id: int):
    """
    Log a workout session with performed exercises and sets.
    """
    # Fetch program with name
    workout_program = db.query(workout_model.WorkoutProgram).filter(
        workout_model.WorkoutProgram.program_id == session_data.program_id,
        workout_model.WorkoutProgram.user_id == user_id
    ).first()
    if not workout_program:
        raise ValueError("Workout program not found or doesn't belong to the user")

    # Create new workout session
    new_session = workout_model.WorkoutSession(
        user_id=user_id,
        program_id=session_data.program_id,
        session_date=session_data.session_date
    )
    db.add(new_session)
    db.flush()

    session_exercises = []
    
    # Process each exercise
    for exercise_data in session_data.exercises:
        # Fetch program exercise with exercise info
        program_exercise = db.query(workout_model.ProgramExercise).join(
            workout_model.Exercise
        ).filter(
            workout_model.ProgramExercise.program_exercise_id == exercise_data.program_exercise_id
        ).first()
        
        if not program_exercise:
            raise ValueError(f"Exercise with id {exercise_data.program_exercise_id} not found")

        # Create session exercise record
        session_exercise = workout_model.SessionExercise(
            session_id=new_session.session_id,
            exercise_id=program_exercise.exercise_id,
            total_volume=0,
            total_intensity_score=0
        )
        db.add(session_exercise)
        db.flush()

        total_volume = 0
        total_intensity = 0

        # Process each set
        for set_data in exercise_data.sets:
            weight = set_data.weight or 0
            reps = set_data.reps or 0
            
            workout_set = workout_model.WorkoutSet(
                session_exercise_id=session_exercise.session_exercise_id,
                set_number=set_data.set_number,
                performed_weight=weight,
                performed_reps=reps
            )
            db.add(workout_set)
            
            # Calculate volume for this set
            set_volume = weight * reps
            total_volume += set_volume
            total_intensity += set_volume * (1 + (reps / 30))

        # Update session exercise with totals (round intensity to integer)
        session_exercise.total_volume = round(total_volume, 2)  # Keep 2 decimal places for volume
        session_exercise.total_intensity_score = round(total_intensity)  # Round to nearest integer
        session_exercises.append(session_exercise)
        db.flush()

    # Update strength skill and calculate XP
    strength_skill = db.query(skill_model.Skill).filter(
        skill_model.Skill.user_id == user_id,
        skill_model.Skill.name == "Strength"
    ).first()

    if strength_skill and strength_skill.last_updated.date() < datetime.utcnow().date():
        strength_skill.daily_xp_earned = 0

    # Calculate and award XP
    workout_data = []
    for session_exercise in session_exercises:
        workout_data.append({
            'exercise_id': session_exercise.exercise_id,
            'volume': session_exercise.total_volume,
            'intensity': session_exercise.total_intensity_score
        })

    xp_to_add = calculate_workout_xp(strength_skill.daily_xp_earned, workout_data)
    update_skill_xp(db, user_id, "Strength", xp_to_add)
    update_activity_streak(db, user_id, "workout")

    db.commit()
    
    # Fetch the complete session data for the response
    complete_session = db.query(workout_model.WorkoutSession).options(
        joinedload(workout_model.WorkoutSession.workout_program),
        joinedload(workout_model.WorkoutSession.exercises).joinedload(workout_model.SessionExercise.exercise),
        joinedload(workout_model.WorkoutSession.exercises).joinedload(workout_model.SessionExercise.sets)
    ).filter(
        workout_model.WorkoutSession.session_id == new_session.session_id
    ).first()

    return {
        "session_id": complete_session.session_id,
        "user_id": complete_session.user_id,
        "program_id": complete_session.program_id,
        "program_name": complete_session.workout_program.name,
        "session_date": complete_session.session_date,
        "exercises": [{
            "exercise_id": ex.exercise_id,
            "name": ex.exercise.name,
            "total_volume": ex.total_volume,
            "total_intensity_score": ex.total_intensity_score,
            "sets": [{
                "set_number": s.set_number,
                "weight": s.performed_weight,
                "reps": s.performed_reps
            } for s in ex.sets]
        } for ex in complete_session.exercises]
    }

def get_workout_program_details(db: Session, program_id: int) -> List[Dict]:
    result = db.execute(
        text("""
        SELECT *
        FROM user_workout_program_details
        WHERE program_id = :program_id
        ORDER BY day_id, program_exercise_id
        """),
        {"program_id": program_id}
    ).fetchall()

    # Convert result to a list of dicts
    return [row._asdict() for row in result]

def get_workout_sessions(db: Session, user_id: int, start_date: datetime = None, end_date: datetime = None) -> List[workout_model.WorkoutSession]:
    query = db.query(workout_model.WorkoutSession).filter(
        workout_model.WorkoutSession.user_id == user_id
    ).join(
        workout_model.WorkoutProgram
    ).options(
        joinedload(workout_model.WorkoutSession.workout_program),
        joinedload(workout_model.WorkoutSession.exercises).joinedload(workout_model.SessionExercise.exercise),
        joinedload(workout_model.WorkoutSession.exercises).joinedload(workout_model.SessionExercise.sets)
    ).order_by(workout_model.WorkoutSession.session_date.desc())

    if start_date:
        query = query.filter(workout_model.WorkoutSession.session_date >= start_date)
    if end_date:
        query = query.filter(workout_model.WorkoutSession.session_date <= end_date)

    return query.all()

def get_or_create_exercise(db: Session, exercise_name: str):
    exercise = db.query(workout_model.Exercise).filter(workout_model.Exercise.name == exercise_name).first()
    if not exercise:
        exercise = workout_model.Exercise(name=exercise_name)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
    return exercise

def get_user_workout_progress(db: Session, user_id: int, start_date: datetime = None, end_date: datetime = None) -> List[Dict]:
    """
    Fetch workout progress data for a user over a specified time frame.
    """
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)  # Default to last 30 days
    if not end_date:
        end_date = datetime.now()
    
    result = db.execute(
        text("""
        SELECT 
            exercise_name,
            session_date,
            SUM(total_volume) as total_volume,
            AVG(total_intensity_score) as avg_intensity,
            MAX(performed_weight) as max_weight,
            MAX(performed_reps) as max_reps
        FROM workout_progress_view
        WHERE user_id = :user_id AND session_date BETWEEN :start_date AND :end_date
        GROUP BY exercise_name, session_date
        ORDER BY exercise_name, session_date
        """),
        {"user_id": user_id, "start_date": start_date, "end_date": end_date}
    ).fetchall()

    return [row._asdict() for row in result]

def delete_workout_program(db: Session, program_id: int):
    """
    Delete a workout program based on the program ID.
    """
    db_program = get_workout_program_by_id(db, program_id)
    if not db_program:
        return None
    
    # Delete related workout sessions
    db.query(workout_model.WorkoutSession).filter(
        workout_model.WorkoutSession.program_id == program_id
    ).delete()

    # Delete related program exercises and workout days
    for day in db_program.workout_days:
        db.query(workout_model.ProgramExercise).filter(
            workout_model.ProgramExercise.day_id == day.day_id
        ).delete()
    db.query(workout_model.WorkoutDay).filter(
        workout_model.WorkoutDay.program_id == program_id
    ).delete()

    # Delete the program itself
    db.delete(db_program)
    db.commit()
    
    return db_program

def archive_workout_program(db: Session, program_id: int):
    """
    Archives a workout program based on the program ID. Preferred method for saving user's workout data
    """
    program = db.query(workout_model.WorkoutProgram).filter(workout_model.WorkoutProgram.program_id == program_id).first()
    if program:
        program.status = 'archived'
        program.archived_at = datetime.now()
        db.commit()
        return {"detail": "Workout program archived successfully"}
    else:
        raise ValueError("Workout program not found")
    
def unarchive_workout_program(db: Session, program_id: int):
    """
    Unarchives a workout program based on the program ID.
    """
    program = db.query(workout_model.WorkoutProgram).filter(workout_model.WorkoutProgram.program_id == program_id).first()
    if program:
        program.status = 'active'
        program.archived_at = None
        db.commit()
        return {"detail": "Workout program unarchived successfully"}
    else:
        raise ValueError("Workout program not found")

def update_workout_program(db: Session, program_id: int, program_update: workout_schema.WorkoutProgramUpdate):
    db_program = get_workout_program_by_id(db, program_id)
    if not db_program:
        return None

    update_data = program_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key != 'workout_days':
            setattr(db_program, key, value)
    
    if 'workout_days' in update_data:
        # Remove existing workout days and exercises
        for day in db_program.workout_days:
            db.query(workout_model.ProgramExercise).filter(workout_model.ProgramExercise.day_id == day.day_id).delete()
        db.query(workout_model.WorkoutDay).filter(workout_model.WorkoutDay.program_id == program_id).delete()

        # Add new workout days and exercises
        for day_data in update_data['workout_days']:
            new_day = workout_model.WorkoutDay(program_id=program_id, day_name=day_data['day_name'])
            db.add(new_day)
            db.flush()

            for exercise_data in day_data['exercises']:
                new_program_exercise = workout_model.ProgramExercise(
                    day_id=new_day.day_id,
                    exercise_id=exercise_data['exercise_id'],
                    sets=exercise_data['sets'],
                    recommended_reps=exercise_data.get('recommended_reps'),
                    recommended_weight=exercise_data.get('recommended_weight')
                )
                db.add(new_program_exercise)

    db_program.updated_at=datetime.now()
    db.commit()
    db.refresh(db_program)
    return db_program

def get_running_progress(db: Session, user_id: int):
    running_logs = db.query(activity_model.UserActivities).filter(
        activity_model.UserActivities.user_id == user_id,
        activity_model.UserActivities.activity_type == "run"
    ).order_by(activity_model.UserActivities.date).all()

    if not running_logs:
        return None

    total_distance = sum(log.distance for log in running_logs)
    total_duration = sum(log.duration for log in running_logs)
    
    return {
        "totalDistance": total_distance,
        "totalDuration": total_duration,
        "longestRun": max(log.distance for log in running_logs),
        "fastestPace": min(log.duration / log.distance for log in running_logs if log.distance > 0),
        "history": [{"date": log.date, "distance": log.distance, "duration": log.duration} for log in running_logs]
    }
    # # Get running data for the last 30 days
    # thirty_days_ago = datetime.now() - timedelta(days=30)
    # running_logs = db.query(activity_model.UserActivities).filter(
    #     activity_model.UserActivities.user_id == user_id,
    #     activity_model.UserActivities.activity_type == "run",
    #     activity_model.UserActivities.date >= thirty_days_ago
    # ).order_by(activity_model.UserActivities.date).all()

    # running_progress = [
    #     {
    #         "date": log.date.strftime("%Y-%m-%d"),
    #         "distance": log.distance,
    #         "duration": log.duration,
    #         "pace": log.duration / log.distance if log.distance > 0 else 0
    #     } for log in running_logs
    # ]

    # total_distance = sum(log.distance for log in running_logs)
    # total_duration = sum(log.duration for log in running_logs)
    # average_pace = total_duration / total_distance if total_distance > 0 else 0
    # fastest_run = min((log.duration / log.distance if log.distance > 0 else float('inf') for log in running_logs), default=0)

    # return {
    #     "runningProgress": running_progress,
    #     "totalDistance": total_distance,
    #     "totalDuration": total_duration,
    #     "averagePace": average_pace,
    #     "fastestRun": fastest_run
    # }

def get_weight_progress(db: Session, user_id: int):
    weight_logs = db.query(activity_model.WeightTracking).filter(
        activity_model.WeightTracking.user_id == user_id
    ).order_by(activity_model.WeightTracking.date).all()

    if not weight_logs:
        return None

    return {
        "current": weight_logs[-1].weight,
        "goal": weight_logs[-1].weight_goal,
        "lowest": min(log.weight for log in weight_logs),
        "highest": max(log.weight for log in weight_logs),
        "change": weight_logs[-1].weight - weight_logs[0].weight,
        "history": [{"date": log.date, "weight": log.weight} for log in weight_logs]
    }

    # weight_progress = [
    #     {
    #         "date": log.date.strftime("%Y-%m-%d"),
    #         "weight": log.weight
    #     } for log in weight_logs
    # ]

    # starting_weight = weight_logs[0].weight if weight_logs else None
    # current_weight = weight_logs[-1].weight if weight_logs else None
    # weight_goal = weight_logs[-1].weight_goal if weight_logs else None
    # total_weight_change = current_weight - starting_weight if starting_weight and current_weight else 0

    # return {
    #     "weightLogs": weight_progress,
    #     "startingWeight": starting_weight,
    #     "currentWeight": current_weight,
    #     "weightGoal": weight_goal,
    #     "totalWeightChange": total_weight_change
    # }

def get_workout_progress(db: Session, user_id: int):
    sessions = db.query(workout_model.WorkoutSession).filter(
        workout_model.WorkoutSession.user_id == user_id
    ).options(
        joinedload(workout_model.WorkoutSession.workout_program),
        joinedload(workout_model.WorkoutSession.exercises).joinedload(workout_model.SessionExercise.exercise),
        joinedload(workout_model.WorkoutSession.exercises).joinedload(workout_model.SessionExercise.sets)
    ).order_by(workout_model.WorkoutSession.session_date.desc()).all()

    return {
        "sessions": [
            workout_schema.WorkoutSession(
                session_id=session.session_id,
                user_id=session.user_id,
                program_id=session.program_id,
                program_name=session.workout_program.name,
                session_date=session.session_date,
                exercises=[
                    workout_schema.SessionExercise(
                        exercise_id=exercise.exercise_id,
                        name=exercise.exercise.name,
                        sets=[
                            workout_schema.ExerciseSet(
                                set_number=set.set_number,
                                weight=set.performed_weight,
                                reps=set.performed_reps
                            ) for set in exercise.sets
                        ],
                        total_volume=exercise.total_volume,
                        total_intensity_score=exercise.total_intensity_score
                    ) for exercise in session.exercises
                ]
            ) for session in sessions
        ]
    }