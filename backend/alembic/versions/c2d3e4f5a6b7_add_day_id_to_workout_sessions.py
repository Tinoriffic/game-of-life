"""Add day_id to workout_sessions (records which program day a session performed)

Lets the logger cycle to the next program day (e.g. Push -> Pull -> Legs) and
show which day was last trained. Nullable: existing sessions predate it.

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-06-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'c2d3e4f5a6b7'
down_revision: Union[str, None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FK_NAME = 'fk_workout_sessions_day_id_workout_days'


def upgrade() -> None:
    conn = op.get_bind()
    columns = [c['name'] for c in inspect(conn).get_columns('workout_sessions')]
    if 'day_id' not in columns:
        op.add_column('workout_sessions', sa.Column('day_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            FK_NAME, 'workout_sessions', 'workout_days', ['day_id'], ['day_id']
        )


def downgrade() -> None:
    conn = op.get_bind()
    columns = [c['name'] for c in inspect(conn).get_columns('workout_sessions')]
    if 'day_id' in columns:
        op.drop_constraint(FK_NAME, 'workout_sessions', type_='foreignkey')
        op.drop_column('workout_sessions', 'day_id')
