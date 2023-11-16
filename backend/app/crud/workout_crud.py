from sqlalchemy.orm import Session, joinedload
from ..schemas.workout_schema import WorkoutProgramCreate
from ..models import WorkoutProgram, WorkoutProgramExercise, WorkoutDay, Exercise

def get_workout_program(db: Session, program_id: int):
    """
    Retrieve a workout program
    """
    return db.query(WorkoutProgram).filter(WorkoutProgram.program_id == program_id).first()
    
def get_user_workout_programs(db: Session, user_id: int):
    """
    Retrieve all of a user's workout programs
    """
    return db.query(WorkoutProgram).options(
        joinedload(WorkoutProgram.workout_days)).filter(
            WorkoutProgram.user_id == user_id).all()

def create_workout_program(db: Session, user_id: int, program: WorkoutProgramCreate):
    """
    Create a new workout program.
    """
    # Check if the program name already exists for the user
    existing_program = db.query(WorkoutProgram).filter(
        WorkoutProgram.user_id == user_id, 
        WorkoutProgram.name == program.name
    ).first()

    if existing_program:
        raise ValueError("A program with this name already exists.")
    
    new_program = WorkoutProgram(
        user_id=user_id,
        name=program.name
    )
    db.add(new_program)
    db.commit()
    db.refresh(new_program)

    # Iterate over each day in the program
    for day in program.workout_days:
        new_day = WorkoutDay(
            program_id=new_program.program_id,
            day_name=day.day_name
        )
        db.add(new_day)

        # Iterate over each exercise in the day
        for exercise in day.exercises:
            exercise_model = get_or_create_exercise(db, exercise.name)
            new_program_exercise = WorkoutProgramExercise(
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
    new_program = db.query(WorkoutProgram).options(
        joinedload(WorkoutProgram.workout_days)
        .joinedload(WorkoutDay.exercises)).filter(
            WorkoutProgram.program_id == new_program.program_id).first()
    
    # # Debugging: Print statements to check if days are loaded correctly
    # print("Created Workout Program: ", new_program.name)
    # print("Days in the Program: ", len(new_program.workout_days))
    # for day in new_program.workout_days:
    #     print("Day Name: ", day.day_name, " | Exercises: ", len(day.exercises))
    #     for exercise in day.exercises:
    #         print("  Exercise Name: ", exercise.exercise.name)

    return new_program

def get_or_create_exercise(db: Session, exercise_name: str):
    exercise = db.query(Exercise).filter(Exercise.name == exercise_name).first()
    if not exercise:
        exercise = Exercise(name=exercise_name)
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
    return exercise
