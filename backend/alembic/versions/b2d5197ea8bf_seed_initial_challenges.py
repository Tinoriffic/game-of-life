"""seed_initial_challenges

Revision ID: b2d5197ea8bf
Revises: 7120ee16069f
Create Date: 2025-08-11 21:48:45.274660

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = 'b2d5197ea8bf'
down_revision: Union[str, None] = '7120ee16069f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    
    # Insert badges first (due to foreign key constraint)
    badges_data = [
        (1, 'Road Warrior', 'Conquered 30 consecutive days of running at least 1 mile', None),
        (2, 'Zen Architect', 'Built a mind palace through 30 days of consistent meditation', None),
        (3, 'Wisdom Collector', 'Hoarded knowledge for 30 days straight', None),
        (4, 'Ice Walker', 'Survived 30 days of cold showers without flinching', None)
    ]
    
    for badge_id, title, description, icon_url in badges_data:
        connection.execute(text("""
            INSERT INTO badges (id, title, description, icon_url) 
            VALUES (:id, :title, :description, :icon_url)
            ON CONFLICT (id) DO NOTHING
        """), {
            "id": badge_id,
            "title": title,
            "description": description,
            "icon_url": icon_url
        })
    
    # Insert challenges
    challenges_data = [
        (
            1,
            'Road Warrior',
            'Run at least 1 mile every day for 30 days. Claim your territory one mile at a time and become an unstoppable force.',
            30,
            '[{"stat": "Endurance", "xp": 8}, {"stat": "Resilience", "xp": 5}]',
            100,
            1,
            'cardio',
            '{"activity_requirements": {"activity": "running", "min_distance": 1.0, "distance_unit": "miles"}}',
            '🏃‍♂️',
            True
        ),
        (
            2,
            'Mind Palace Builder',
            'Meditate for at least 10 minutes every day for 30 days. Construct your inner sanctuary and master the art of mental clarity.',
            30,
            '[{"stat": "Wisdom", "xp": 7}, {"stat": "Resilience", "xp": 6}]',
            100,
            2,
            'meditation',
            '{"activity_requirements": {"min_duration": 10, "duration_unit": "minutes"}}',
            '🧘‍♀️',
            True
        ),
        (
            3,
            'Knowledge Hoarder',
            'Read for at least 30 minutes every day for 30 days. Collect wisdom like treasure and expand your mental library.',
            30,
            '[{"stat": "Wisdom", "xp": 8}, {"stat": "Intelligence", "xp": 5}]',
            100,
            3,
            'learning',
            '{"activity_requirements": {"subject": "reading", "min_duration": 30, "duration_unit": "minutes"}}',
            '📚',
            True
        ),
        (
            4,
            'Arctic Survivor',
            'Take a cold shower every day for 30 days. Embrace the freeze and forge unbreakable mental toughness.',
            30,
            '[{"stat": "Resilience", "xp": 12}]',
            150,
            4,
            None,
            None,
            '🚿',
            True
        )
    ]
    
    for challenge_data in challenges_data:
        validation_rules_val = challenge_data[8]
        if validation_rules_val is None:
            validation_rules_val = 'null'
        else:
            validation_rules_val = f"'{validation_rules_val}'"
            
        activity_type_val = challenge_data[7]
        if activity_type_val is None:
            activity_type_val = 'NULL'
        else:
            activity_type_val = f"'{activity_type_val}'"
            
        connection.execute(text(f"""
            INSERT INTO challenges (
                id, title, description, duration_days, target_stats, 
                completion_xp_bonus, badge_id, activity_type, validation_rules, 
                icon, is_active
            ) VALUES (
                {challenge_data[0]}, '{challenge_data[1]}', '{challenge_data[2]}', {challenge_data[3]}, '{challenge_data[4]}'::jsonb,
                {challenge_data[5]}, {challenge_data[6]}, {activity_type_val}, {validation_rules_val}::jsonb,
                '{challenge_data[9]}', {challenge_data[10]}
            )
            ON CONFLICT (id) DO NOTHING
        """))


def downgrade() -> None:
    connection = op.get_bind()
    
    # Remove challenges
    connection.execute(text("DELETE FROM challenges WHERE id IN (1, 2, 3, 4)"))
    
    # Remove badges
    connection.execute(text("DELETE FROM badges WHERE id IN (1, 2, 3, 4)"))
