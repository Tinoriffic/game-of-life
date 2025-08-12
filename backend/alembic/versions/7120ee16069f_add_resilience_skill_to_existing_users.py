"""add_resilience_skill_to_existing_users

Revision ID: 7120ee16069f
Revises: 75c3d0eb2635
Create Date: 2025-08-11 21:48:06.106139

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = '7120ee16069f'
down_revision: Union[str, None] = '75c3d0eb2635'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Resilience skill to all existing users
    connection = op.get_bind()
    
    # First, check if any users exist and don't already have Resilience skill
    result = connection.execute(text("""
        SELECT DISTINCT u.id 
        FROM users u 
        LEFT JOIN skills s ON u.id = s.user_id AND s.name = 'Resilience'
        WHERE s.id IS NULL
    """))
    
    user_ids = [row[0] for row in result.fetchall()]
    
    if user_ids:
        # Insert Resilience skill for users who don't have it
        for user_id in user_ids:
            connection.execute(text("""
                INSERT INTO skills (user_id, name, xp, level, daily_xp_earned, last_updated)
                VALUES (:user_id, 'Resilience', 0, 1, 0, NOW())
            """), {"user_id": user_id})


def downgrade() -> None:
    # Remove Resilience skill from all users
    connection = op.get_bind()
    connection.execute(text("DELETE FROM skills WHERE name = 'Resilience'"))
