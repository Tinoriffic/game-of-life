from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from passlib.context import CryptContext
from .xp_calculator import calculate_meditation_xp, calculate_social_interaction_xp, calculate_running_xp, calculate_learning_xp, calculate_workout_xp, calculate_weight_tracking_xp, calculate_reflection_xp
from .skill_manager import update_skill_xp
from datetime import datetime, timedelta

# Instantiate a CryptContext for hashing passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user(db: Session, user_id: int):
    """
    Retrieve a user's data by user_id
    """
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    """
    Retrieve a user's data by username
    """
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    """
    Retrieve a user's data by username
    """
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 10):
    """
    Retrieves a list of users, limit of 10
    """
    return db.query(models.User).offset(skip).limit(limit).all()

def get_user_skills(db: Session, user_id: int):
    """
    Retrieve a user's skills
    """
    return db.query(models.Skill).filter(models.Skill.user_id == user_id)

def get_user_activity_streaks(db: Session, user_id: int):
    """
    Retrieve a user's streaks
    """
    return db.query(models.ActivityStreak).filter(models.ActivityStreak.user_id == user_id)

def create_user(db: Session, user: schemas.UserCreate):
    """
    Creates a new user given a username and password
    """
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        city=user.city,
        occupation=user.occupation)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    default_skills = ['Awareness', 'Charisma', 'Endurance', 'Intelligence', 'Strength', 'Wisdom']
    for skill in default_skills:
        db_skill = models.Skill(name=skill, user_id=new_user.id)
        db.add(db_skill)
    db.commit()

    return new_user

def log_activity(db: Session, user_id: int, activity_data: schemas.ActivityLog):
    """
    Log an activity for a user and update their skills' XP accordingly.
    """
    # Step 1: Log the activity
    new_activity = models.UserActivities(user_id=user_id, **activity_data.model_dump())
    db.add(new_activity)
    db.query(models.WeightTracking).filter()
    user_skills = get_user_skills(db, user_id)

    # Check if it's a new day
    for skill in user_skills:
        if skill.last_updated.date() < datetime.utcnow().date():
            skill.daily_xp_earned = 0

    # Step 2: Calculate XP based on activity type
    
    skill_xp_dict = {skill.name: skill.daily_xp_earned for skill in user_skills}

    xp_to_add = 0
    if activity_data.activity_type == "meditate":
        xp_to_add = calculate_meditation_xp(activity_data.duration, skill_xp_dict.get("Awareness", 0))
    elif activity_data.activity_type == "workout":
        xp_to_add = calculate_workout_xp(activity_data.volume, 0)  # Previous volume can be fetched as needed
    elif activity_data.activity_type == "run":
        xp_to_add = calculate_running_xp(activity_data.duration, activity_data.distance, skill_xp_dict.get("Endurance", 0))
    elif activity_data.activity_type == "socialize":
        xp_to_add = calculate_social_interaction_xp(activity_data.description)
    elif activity_data.activity_type == "read" or activity_data.activity_type == "take_class":
        xp_to_add = calculate_learning_xp(activity_data.activity_type, activity_data.duration, skill_xp_dict.get("Intelligence", 0))
    elif activity_data.activity_type == "reflect":
        xp_to_add = calculate_reflection_xp(skill_xp_dict.get("Wisdom", 0))

    # Step 3: Update Skill XP
    skill_name = map_activity_to_skill(activity_data.activity_type)
    update_skill_xp(db, user_id, skill_name, xp_to_add)
    new_activity.xp_earned = xp_to_add

    db.commit()
    return new_activity

def map_activity_to_skill(activity_type: str) -> str:
    """
    Map an activity type to the corresponding skill.
    """
    mapping = {
        "meditate" : "Awareness",
        "workout" : "Strength",
        "run" : "Endurance",
        "socialize" : "Charisma",
        "read" : "Intelligence",
        "take_class" : "Intelligence",
        "reflect" : "Wisdom"
    }

    return mapping.get(activity_type, "")

def log_weight_entry(db: Session, user_id: int, weight_entry: schemas.WeightEntry):
    """
    Log a weight entry for a user and update their skills' XP accordingly.
    """
    # Check if its first entry, if so, 
    first_entry = db.query(models.WeightTracking).filter(models.WeightTracking.user_id == user_id).first()
    is_first_entry = first_entry is None
    starting_weight = weight_entry.weight if is_first_entry else first_entry.weight
    # If it's the first entry or if a new weight goal is provided, update it
    weight_goal = weight_entry.weight_goal if is_first_entry or weight_entry.weight_goal is not None else first_entry.weight_goal

    # Create a new weight tracking record
    new_weight_entry = models.WeightTracking(
        user_id=user_id, 
        weight=weight_entry.weight, 
        date=weight_entry.date, 
        weight_goal=weight_entry.weight_goal,
        is_starting_weight=is_first_entry
    )
    db.add(new_weight_entry)

    # Fetch recent weight logs for XP calculation
    weight_logs = get_recent_weight_logs(db, user_id)

    # Calculate the XP for weight tracking
    if weight_logs and starting_weight is not None and weight_goal is not None:
        xp_to_add = calculate_weight_tracking_xp(weight_logs, starting_weight, weight_goal)
        # Update skill XP
        update_skill_xp(db, user_id, "Strength", xp_to_add)

    db.commit()
    return new_weight_entry

def create_workout_program(db: Session, user_id: int, program: schemas.WorkoutProgramCreate):
    """
    Create a new workout program.
    """
    new_program = models.WorkoutProgram(
        user_id=user_id,
        name=program.name
    )
    db.add(new_program)
    db.commit()
    db.refresh(new_program)

    # Iterate over each day in the program
    for day in program.workout_days:
        new_day = models.WorkoutDay(
            program_id=new_program.program_id,
            day_name=day.day_name
        )
        db.add(new_day)

        # Iterate over each exercise in the day
        for exercise in day.exercises:
            exercise_model = get_or_create_exercise(db, exercise.name)
            new_program_exercise = models.WorkoutProgramExercise(
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
    new_program = db.query(models.WorkoutProgram).options(
        joinedload(models.WorkoutProgram.workout_days)
        .joinedload(models.WorkoutDay.exercises)).filter(
            models.WorkoutProgram.program_id == new_program.program_id).first()
    
    # Debugging: Print statements to check if days are loaded correctly
    print("Created Workout Program: ", new_program.name)
    print("Days in the Program: ", len(new_program.workout_days))
    for day in new_program.workout_days:
        print("Day Name: ", day.day_name, " | Exercises: ", len(day.exercises))
        for exercise in day.exercises:
            print("  Exercise Name: ", exercise.exercise.name)

    return new_program

def get_or_create_exercise(db: Session, exercise_name: str):
    exercise = db.query(models.Exercise).filter(models.Exercise.name == exercise_name).first()
    if not exercise:
        exercise = models.Exercise(name=exercise_name)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
    return exercise

def get_recent_weight_logs(db: Session, user_id: int):
    """
    Fetch the user's weight logs from the past two weeks.
    """
    two_weeks_ago = datetime.utcnow().date() - timedelta(days=14)
    return db.query(models.WeightTracking).filter(
        models.WeightTracking.user_id == user_id,
        models.WeightTracking.date >= two_weeks_ago
    ).order_by(models.WeightTracking.date).all()
