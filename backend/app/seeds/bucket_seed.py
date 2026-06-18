"""
Seed the fixed bucket taxonomy + the habit library (curated example habits).

Buckets are app-data, not code: this seed is idempotent (upsert by key) and
runs at startup, so adding/tuning buckets never requires new backend logic.
"""
import logging
from sqlalchemy.orm import Session

from ..models.habit_model import Bucket, HabitTemplate

logger = logging.getLogger(__name__)

BUCKETS = [
    {
        "key": "strength_training",
        "name": "Strength Training",
        "description": "Resistance work — lifting, calisthenics, anything that builds strength.",
        "attribute": "Strength",
        "detail_kind": "volume",
        "base_xp": 12,
        "icon": "🏋️",
        "color": "#FF6B6B",
        "sort_order": 1,
        "challenge_tags": ["strength", "workout"],
        # The flagship here is "Create a workout program" (a special action in the
        # picker, not a template). These templates are the generic check-off options
        # for people who don't want to follow/log a structured program.
        "templates": [
            {"name": "Gym session", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Calisthenics", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Home workout", "default_cadence_type": "weekly", "default_times_per_week": 3},
        ],
    },
    {
        "key": "cardio",
        "name": "Cardio",
        "description": "Anything that gets your heart rate up for a sustained stretch.",
        "attribute": "Endurance",
        "detail_kind": "distance_duration",
        "base_xp": 10,
        "icon": "🏃",
        "color": "#4ECDC4",
        "sort_order": 2,
        "challenge_tags": ["cardio", "run"],
        "templates": [
            {"name": "Morning run", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Cycling", "default_cadence_type": "weekly", "default_times_per_week": 2},
            {"name": "Basketball", "default_cadence_type": "weekly", "default_times_per_week": 1},
            {"name": "10k steps", "default_cadence_type": "daily"},
            {"name": "Swimming", "default_cadence_type": "weekly", "default_times_per_week": 2},
        ],
    },
    {
        "key": "mindfulness",
        "name": "Mindfulness",
        "description": "Meditation, breathwork — training attention and awareness.",
        "attribute": "Awareness",
        "detail_kind": "duration",
        "base_xp": 10,
        "icon": "🧘",
        "color": "#A8DADC",
        "sort_order": 3,
        "challenge_tags": ["meditation", "meditate"],
        "templates": [
            {"name": "Meditate", "default_cadence_type": "daily"},
            {"name": "Breathwork", "default_cadence_type": "daily"},
            {"name": "Evening wind-down", "default_cadence_type": "daily"},
        ],
    },
    {
        "key": "mental_practice",
        "name": "Mental Practice",
        "description": "Deliberate practice of cognitive skills — algorithms, languages, chess.",
        "attribute": "Intelligence",
        "detail_kind": "duration",
        "base_xp": 10,
        "icon": "🧠",
        "color": "#9B5DE5",
        "sort_order": 4,
        "challenge_tags": ["learning"],
        "templates": [
            {"name": "LeetCode practice", "default_cadence_type": "weekdays", "default_weekdays": [0, 1, 2, 3, 4]},
            {"name": "System design", "default_cadence_type": "weekly", "default_times_per_week": 2},
            {"name": "Spanish practice", "default_cadence_type": "daily"},
            {"name": "Chess study", "default_cadence_type": "weekly", "default_times_per_week": 3},
        ],
    },
    {
        "key": "study",
        "name": "Study & Courses",
        "description": "Structured learning — courses, certifications, lectures.",
        "attribute": "Intelligence",
        "detail_kind": "duration",
        "base_xp": 10,
        "icon": "📚",
        "color": "#7B68EE",
        "sort_order": 5,
        "challenge_tags": ["learning"],
        "templates": [
            {"name": "AWS cert course", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Lecture videos", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Online course session", "default_cadence_type": "weekly", "default_times_per_week": 2},
        ],
    },
    {
        "key": "reading_reflection",
        "name": "Reading & Reflection",
        "description": "Reading, journaling, reviews — slow thinking that compounds.",
        "attribute": "Wisdom",
        "detail_kind": "pages",
        "base_xp": 10,
        "icon": "📖",
        "color": "#F4A261",
        "sort_order": 6,
        "challenge_tags": ["reading", "journal"],
        "templates": [
            {"name": "Read 20 min", "default_cadence_type": "daily"},
            {"name": "Journal", "default_cadence_type": "daily"},
            {"name": "Weekly review", "default_cadence_type": "weekly", "default_times_per_week": 1},
        ],
    },
    {
        "key": "social",
        "name": "Social",
        "description": "Outings, events, calls — practical reps for connection.",
        "attribute": "Charisma",
        "detail_kind": "note",
        "base_xp": 12,
        "icon": "💬",
        "color": "#FFD700",
        "sort_order": 7,
        "challenge_tags": ["social"],
        "templates": [
            {"name": "Social outing", "default_cadence_type": "weekly", "default_times_per_week": 2},
            {"name": "Networking event", "default_cadence_type": "weekly", "default_times_per_week": 1},
            {"name": "Call family", "default_cadence_type": "weekly", "default_times_per_week": 2},
            {"name": "Reach out to a friend", "default_cadence_type": "weekly", "default_times_per_week": 3},
        ],
    },
    {
        "key": "discipline",
        "name": "Discipline",
        "description": "Cold showers, wake-up times, abstinence — binary acts of will.",
        "attribute": "Resilience",
        "detail_kind": "none",
        "base_xp": 10,
        "icon": "🛡️",
        "color": "#E63946",
        "sort_order": 8,
        "challenge_tags": ["discipline"],
        "templates": [
            {"name": "Cold shower", "default_cadence_type": "daily"},
            {"name": "Up by 6am", "default_cadence_type": "weekdays", "default_weekdays": [0, 1, 2, 3, 4]},
            {"name": "No alcohol", "default_cadence_type": "daily"},
            {"name": "Fasting window", "default_cadence_type": "daily"},
            {"name": "Phone-free morning", "default_cadence_type": "daily"},
        ],
    },
    {
        "key": "creative",
        "name": "Creative Work",
        "description": "Making things — music, writing, side projects, videos.",
        "attribute": "Creativity",
        "detail_kind": "duration",
        "base_xp": 10,
        "icon": "🎨",
        "color": "#F72585",
        "sort_order": 9,
        "challenge_tags": ["creative"],
        "templates": [
            {"name": "Guitar practice", "default_cadence_type": "daily"},
            {"name": "Writing", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Side project", "default_cadence_type": "weekly", "default_times_per_week": 3},
            {"name": "Make a video", "default_cadence_type": "weekly", "default_times_per_week": 1},
        ],
    },
    {
        "key": "measurement",
        "name": "Measurements",
        "description": "Habits whose log IS a data point — tracked daily, charted over time.",
        "attribute": None,
        "detail_kind": "none",
        "base_xp": 0,
        "icon": "📈",
        "color": "#06D6A0",
        "sort_order": 10,
        "challenge_tags": [],
        "templates": [
            {"name": "Daily weigh-in", "default_cadence_type": "daily",
             "measurement_kind": "weight", "measurement_unit": "lbs"},
            {"name": "Sleep hours", "default_cadence_type": "daily",
             "measurement_kind": "sleep", "measurement_unit": "hrs"},
            {"name": "Resting heart rate", "default_cadence_type": "daily",
             "measurement_kind": "resting_hr", "measurement_unit": "bpm"},
        ],
    },
]


def seed_buckets(db: Session):
    """Upsert buckets by key and templates by (bucket, name). Safe to run every startup."""
    for spec in BUCKETS:
        templates = spec.pop("templates", [])
        bucket = db.query(Bucket).filter(Bucket.key == spec["key"]).first()
        if bucket:
            for field, value in spec.items():
                setattr(bucket, field, value)
        else:
            bucket = Bucket(**spec)
            db.add(bucket)
            db.flush()

        spec["templates"] = templates  # restore for idempotent re-entry
        existing = {t.name: t for t in db.query(HabitTemplate).filter(HabitTemplate.bucket_id == bucket.id)}
        seeded_names = {t["name"] for t in templates}
        for order, tmpl in enumerate(templates):
            row = existing.get(tmpl["name"])
            if row:
                for field, value in tmpl.items():
                    setattr(row, field, value)
                row.sort_order = order
            else:
                db.add(HabitTemplate(bucket_id=bucket.id, sort_order=order, **tmpl))
        # Prune templates that were removed from the seed (e.g. old Push/Pull/Leg days).
        for name, row in existing.items():
            if name not in seeded_names:
                db.delete(row)

    db.commit()
    logger.info("Bucket taxonomy + habit library seeded (%d buckets)", len(BUCKETS))
