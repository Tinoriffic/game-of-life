"""
Curated additions to the global exercise library. Idempotent: an exercise is
inserted only if one with the same name doesn't already exist. Lookup FK ids
(category/muscle/equipment/difficulty/type) reference the seeded lookup tables.
"""
import logging
from sqlalchemy.orm import Session

from ..models.workout_model import Exercise

logger = logging.getLogger(__name__)

# muscle_group: 1 Chest, 2 Back, 3 Shoulders, 4 Arms, 5 Legs, 6 Core, 7 Full Body
# equipment:    1 Bodyweight, 2 Free Weights, 3 Machines, 4 Cables, 5 Bands, 6 Other
# difficulty:   1 Beginner, 2 Intermediate, 3 Advanced   |   type: 1 Compound, 2 Isolation
EXTRA_EXERCISES = [
    {"name": "Incline DB Press", "muscle_group_id": 1, "equipment_id": 2,
     "difficulty_level_id": 2, "exercise_type_id": 1,
     "primary_muscles": "Upper chest", "secondary_muscles": "Shoulders, Triceps"},
    {"name": "Lateral Raise", "muscle_group_id": 3, "equipment_id": 2,
     "difficulty_level_id": 1, "exercise_type_id": 2, "primary_muscles": "Side delts"},
    {"name": "Zottman Curl", "muscle_group_id": 4, "equipment_id": 2,
     "difficulty_level_id": 2, "exercise_type_id": 2,
     "primary_muscles": "Biceps", "secondary_muscles": "Forearms"},
    {"name": "Seated Leg Curl", "muscle_group_id": 5, "equipment_id": 3,
     "difficulty_level_id": 1, "exercise_type_id": 2, "primary_muscles": "Hamstrings"},
    {"name": "Ab Wheel", "muscle_group_id": 6, "equipment_id": 6,
     "difficulty_level_id": 2, "exercise_type_id": 1, "primary_muscles": "Abs"},
]


# Exercises whose logged value is a duration (hold/carry), not reps. Idempotently
# flipped to tracking_type='time' so the logger shows a stopwatch instead of reps.
TIMED_EXERCISES = {"Plank", "Farmer's Walk"}


def seed_exercises(db: Session):
    created = 0
    for spec in EXTRA_EXERCISES:
        if db.query(Exercise).filter(Exercise.name == spec["name"]).first():
            continue
        db.add(Exercise(category_id=1, is_global=True, user_id=None, **spec))
        created += 1

    updated = 0
    for ex in db.query(Exercise).filter(Exercise.name.in_(TIMED_EXERCISES)).all():
        if ex.tracking_type != "time":
            ex.tracking_type = "time"
            updated += 1

    if created or updated:
        db.commit()
    logger.info("Exercise library: %d new, %d set time-tracked", created, updated)
