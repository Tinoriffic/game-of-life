"""program_exercises: tracking-type-aware prescription

Drop the unused recommended_weight (it never drove anything - the logger prefills
from the previous session, which a static target would only clobber). Add
recommended_duration_seconds for time-tracked exercises (planks, carries) so the
prescription matches the exercise's tracking_type.

The user_workout_program_details view selects recommended_weight, so it must be
dropped and recreated (security_invoker preserved - see the Supabase security
model) around the column change.

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-07-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5a6b7c8d9e0'
down_revision: Union[str, None] = 'e4f5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _create_view(prescription_column: str) -> None:
    op.execute(f"""
        CREATE OR REPLACE VIEW user_workout_program_details
        WITH (security_invoker = true) AS
        SELECT
            wp.program_id,
            wp.user_id,
            wp.name AS program_name,
            wd.day_id,
            wd.day_name,
            pe.program_exercise_id,
            e.exercise_id,
            e.name AS exercise_name,
            pe.sets,
            pe.recommended_reps,
            pe.{prescription_column}
        FROM workout_programs wp
        JOIN workout_days wd ON wp.program_id = wd.program_id
        JOIN program_exercises pe ON wd.day_id = pe.day_id
        JOIN exercises e ON pe.exercise_id = e.exercise_id;
    """)


def upgrade() -> None:
    op.execute("DROP VIEW IF EXISTS user_workout_program_details")
    op.add_column('program_exercises', sa.Column('recommended_duration_seconds', sa.Integer(), nullable=True))
    op.drop_column('program_exercises', 'recommended_weight')
    _create_view('recommended_duration_seconds')


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS user_workout_program_details")
    op.add_column('program_exercises', sa.Column('recommended_weight', sa.Float(), server_default='0', nullable=True))
    op.drop_column('program_exercises', 'recommended_duration_seconds')
    _create_view('recommended_weight')
