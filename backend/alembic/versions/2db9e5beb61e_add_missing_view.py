"""add missing view

Revision ID: 2db9e5beb61e
Revises: ea3db47a7b0a
Create Date: 2024-05-24 21:41:31.709263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '2db9e5beb61e'
down_revision: Union[str, None] = 'ea3db47a7b0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    connection = op.get_bind()
    result = connection.execute(text("SELECT to_regclass('public.user_workout_program_details');"))
    view_exists = result.scalar() is not None

    if view_exists:
        # If the view exists, drop it first
        op.execute("DROP VIEW user_workout_program_details;")

    op.execute("""
        CREATE VIEW user_workout_program_details AS
        SELECT 
            u.id AS user_id,
            wp.program_id,
            wp.name AS program_name,
            wd.day_id,
            wd.day_name,
            e.exercise_id,
            e.name AS exercise_name,
            wpe.program_exercise_id,
            wpe.sets,
            wpe.recommended_reps,
            wpe.recommended_weight
        FROM users u
        JOIN workout_programs wp ON u.id = wp.user_id
        JOIN workout_days wd ON wp.program_id = wd.program_id
        JOIN workout_program_exercises wpe ON wd.day_id = wpe.day_id
        JOIN exercises e ON wpe.exercise_id = e.exercise_id;
    """)


def downgrade():
    op.execute("DROP VIEW IF EXISTS user_workout_program_details;")
