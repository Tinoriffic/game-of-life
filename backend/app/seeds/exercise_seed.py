"""
Curated additions to the global exercise library. Idempotent: an exercise is
inserted only if one with the same name doesn't already exist. Muscle group and
equipment are given by NAME and resolved to ids at seed time, so the list stays
readable and survives id drift (e.g. newly added "Smith Machine" equipment).
"""
import logging
from sqlalchemy.orm import Session

from ..models.workout_model import Exercise, ExerciseMuscleGroup, ExerciseEquipment

logger = logging.getLogger(__name__)

# difficulty: 1 Beginner, 2 Intermediate, 3 Advanced   |   type: 1 Compound, 2 Isolation
# muscle/equipment are by name (see the lookup tables). tracking defaults to "reps".
EXTRA_EXERCISES = [
    # --- Chest ---
    {"name": "Incline DB Press", "muscle": "Chest", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Upper chest", "secondary_muscles": "Shoulders, Triceps"},
    {"name": "Decline Bench Press", "muscle": "Chest", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Lower chest", "secondary_muscles": "Triceps"},
    {"name": "Pec Deck", "muscle": "Chest", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Chest"},
    {"name": "Chest Dip", "muscle": "Chest", "equipment": "Bodyweight", "difficulty": 2, "type": 1, "primary_muscles": "Lower chest", "secondary_muscles": "Triceps, Shoulders"},
    {"name": "Smith Machine Bench Press", "muscle": "Chest", "equipment": "Smith Machine", "difficulty": 1, "type": 1, "primary_muscles": "Chest", "secondary_muscles": "Triceps, Shoulders"},
    {"name": "Smith Machine Incline Press", "muscle": "Chest", "equipment": "Smith Machine", "difficulty": 2, "type": 1, "primary_muscles": "Upper chest", "secondary_muscles": "Shoulders, Triceps"},

    # --- Back ---
    {"name": "Chin-up", "muscle": "Back", "equipment": "Bodyweight", "difficulty": 2, "type": 1, "primary_muscles": "Lats", "secondary_muscles": "Biceps"},
    {"name": "Chest-Supported Row", "muscle": "Back", "equipment": "Machines", "difficulty": 1, "type": 1, "primary_muscles": "Mid back", "secondary_muscles": "Lats, Biceps"},
    {"name": "Straight-Arm Pulldown", "muscle": "Back", "equipment": "Cables", "difficulty": 1, "type": 2, "primary_muscles": "Lats"},
    {"name": "Pendlay Row", "muscle": "Back", "equipment": "Free Weights", "difficulty": 3, "type": 1, "primary_muscles": "Mid back", "secondary_muscles": "Lats, Biceps"},
    {"name": "Rack Pull", "muscle": "Back", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Upper back, Traps", "secondary_muscles": "Glutes, Hamstrings"},
    {"name": "Smith Machine Row", "muscle": "Back", "equipment": "Smith Machine", "difficulty": 1, "type": 1, "primary_muscles": "Mid back", "secondary_muscles": "Lats, Biceps"},

    # --- Shoulders ---
    {"name": "Lateral Raise", "muscle": "Shoulders", "equipment": "Free Weights", "difficulty": 1, "type": 2, "primary_muscles": "Side delts"},
    {"name": "Arnold Press", "muscle": "Shoulders", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Shoulders", "secondary_muscles": "Triceps"},
    {"name": "Cable Lateral Raise", "muscle": "Shoulders", "equipment": "Cables", "difficulty": 1, "type": 2, "primary_muscles": "Side delts"},
    {"name": "Machine Shoulder Press", "muscle": "Shoulders", "equipment": "Machines", "difficulty": 1, "type": 1, "primary_muscles": "Shoulders", "secondary_muscles": "Triceps"},
    {"name": "Reverse Pec Deck", "muscle": "Shoulders", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Rear delts"},
    {"name": "Cable Rear Delt Fly", "muscle": "Shoulders", "equipment": "Cables", "difficulty": 1, "type": 2, "primary_muscles": "Rear delts"},
    {"name": "Front Raise", "muscle": "Shoulders", "equipment": "Free Weights", "difficulty": 1, "type": 2, "primary_muscles": "Front delts"},
    {"name": "Smith Machine Shoulder Press", "muscle": "Shoulders", "equipment": "Smith Machine", "difficulty": 1, "type": 1, "primary_muscles": "Shoulders", "secondary_muscles": "Triceps"},

    # --- Arms ---
    {"name": "Zottman Curl", "muscle": "Arms", "equipment": "Free Weights", "difficulty": 2, "type": 2, "primary_muscles": "Biceps", "secondary_muscles": "Forearms"},
    {"name": "Barbell Curl", "muscle": "Arms", "equipment": "Free Weights", "difficulty": 1, "type": 2, "primary_muscles": "Biceps"},
    {"name": "EZ-Bar Curl", "muscle": "Arms", "equipment": "Free Weights", "difficulty": 1, "type": 2, "primary_muscles": "Biceps"},
    {"name": "Incline Dumbbell Curl", "muscle": "Arms", "equipment": "Free Weights", "difficulty": 2, "type": 2, "primary_muscles": "Biceps"},
    {"name": "Cable Hammer Curl", "muscle": "Arms", "equipment": "Cables", "difficulty": 1, "type": 2, "primary_muscles": "Biceps, Forearms"},
    {"name": "Overhead Tricep Extension", "muscle": "Arms", "equipment": "Free Weights", "difficulty": 1, "type": 2, "primary_muscles": "Triceps"},
    {"name": "Rope Pushdown", "muscle": "Arms", "equipment": "Cables", "difficulty": 1, "type": 2, "primary_muscles": "Triceps"},
    {"name": "Close-Grip Bench Press", "muscle": "Arms", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Triceps", "secondary_muscles": "Chest, Shoulders"},

    # --- Legs ---
    {"name": "Seated Leg Curl", "muscle": "Legs", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Hamstrings"},
    {"name": "Leg Extension", "muscle": "Legs", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Quadriceps"},
    {"name": "Lying Leg Curl", "muscle": "Legs", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Hamstrings"},
    {"name": "Standing Calf Raise", "muscle": "Legs", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Calves"},
    {"name": "Seated Calf Raise", "muscle": "Legs", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Calves"},
    {"name": "Good Morning", "muscle": "Legs", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Hamstrings", "secondary_muscles": "Glutes, Lower back"},
    {"name": "Hip Abduction", "muscle": "Legs", "equipment": "Machines", "difficulty": 1, "type": 2, "primary_muscles": "Glutes"},
    {"name": "Nordic Hamstring Curl", "muscle": "Legs", "equipment": "Bodyweight", "difficulty": 3, "type": 2, "primary_muscles": "Hamstrings"},
    {"name": "Smith Machine Squat", "muscle": "Legs", "equipment": "Smith Machine", "difficulty": 1, "type": 1, "primary_muscles": "Quadriceps", "secondary_muscles": "Glutes, Hamstrings"},
    {"name": "Wall Sit", "muscle": "Legs", "equipment": "Bodyweight", "difficulty": 1, "type": 2, "primary_muscles": "Quadriceps", "tracking_type": "time"},

    # --- Core ---
    {"name": "Ab Wheel", "muscle": "Core", "equipment": "Other", "difficulty": 2, "type": 1, "primary_muscles": "Abs"},
    {"name": "Cable Crunch", "muscle": "Core", "equipment": "Cables", "difficulty": 1, "type": 2, "primary_muscles": "Abs"},
    {"name": "Bicycle Crunch", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 1, "type": 2, "primary_muscles": "Abs, Obliques"},
    {"name": "Dead Bug", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 1, "type": 2, "primary_muscles": "Abs"},
    {"name": "Sit-up", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 1, "type": 2, "primary_muscles": "Abs"},
    {"name": "Lying Leg Raise", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 1, "type": 2, "primary_muscles": "Lower abs"},
    {"name": "V-Up", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 2, "type": 2, "primary_muscles": "Abs"},
    {"name": "Mountain Climbers", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 1, "type": 1, "primary_muscles": "Abs", "secondary_muscles": "Shoulders, Hip flexors"},
    {"name": "Side Plank", "muscle": "Core", "equipment": "Bodyweight", "difficulty": 1, "type": 2, "primary_muscles": "Obliques", "tracking_type": "time"},

    # --- Full Body ---
    {"name": "Thruster", "muscle": "Full Body", "equipment": "Free Weights", "difficulty": 2, "type": 1, "primary_muscles": "Legs, Shoulders", "secondary_muscles": "Core, Triceps"},
    {"name": "Burpee", "muscle": "Full Body", "equipment": "Bodyweight", "difficulty": 2, "type": 1, "primary_muscles": "Full body"},
    {"name": "Turkish Get-up", "muscle": "Full Body", "equipment": "Free Weights", "difficulty": 3, "type": 1, "primary_muscles": "Full body", "secondary_muscles": "Core, Shoulders"},
    {"name": "Box Jump", "muscle": "Full Body", "equipment": "Bodyweight", "difficulty": 2, "type": 1, "primary_muscles": "Legs"},
    {"name": "Sled Push", "muscle": "Full Body", "equipment": "Other", "difficulty": 2, "type": 1, "primary_muscles": "Legs", "secondary_muscles": "Core, Shoulders"},
    {"name": "Battle Ropes", "muscle": "Full Body", "equipment": "Other", "difficulty": 2, "type": 1, "primary_muscles": "Shoulders, Arms", "secondary_muscles": "Core", "tracking_type": "time"},
]


# Legacy exercises created before tracking_type existed - flip idempotently so the
# logger shows a stopwatch. (New timed exercises above set tracking_type directly.)
TIMED_EXERCISES = {"Plank", "Farmer's Walk"}


def seed_exercises(db: Session):
    muscles = {m.name: m.id for m in db.query(ExerciseMuscleGroup).all()}
    equipment = {e.name: e.id for e in db.query(ExerciseEquipment).all()}

    created = 0
    for spec in EXTRA_EXERCISES:
        if db.query(Exercise).filter(Exercise.name == spec["name"]).first():
            continue
        mg_id, eq_id = muscles.get(spec["muscle"]), equipment.get(spec["equipment"])
        if mg_id is None or eq_id is None:
            logger.warning("Skipping %s - missing lookup (%s / %s)", spec["name"], spec["muscle"], spec["equipment"])
            continue
        db.add(Exercise(
            name=spec["name"], category_id=1, is_global=True, user_id=None,
            muscle_group_id=mg_id, equipment_id=eq_id,
            difficulty_level_id=spec.get("difficulty", 2),
            exercise_type_id=spec.get("type", 1),
            tracking_type=spec.get("tracking_type", "reps"),
            primary_muscles=spec.get("primary_muscles"),
            secondary_muscles=spec.get("secondary_muscles"),
        ))
        created += 1

    updated = 0
    for ex in db.query(Exercise).filter(Exercise.name.in_(TIMED_EXERCISES)).all():
        if ex.tracking_type != "time":
            ex.tracking_type = "time"
            updated += 1

    if created or updated:
        db.commit()
    logger.info("Exercise library: %d new, %d set time-tracked", created, updated)
