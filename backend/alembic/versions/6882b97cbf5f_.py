"""empty message

Revision ID: 6882b97cbf5f
Revises: 219c52365ae6
Create Date: 2024-10-28 06:44:06.385263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6882b97cbf5f'
down_revision: Union[str, None] = '219c52365ae6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('workout_programs', 'status',
               existing_type=postgresql.ENUM('active', 'archived', name='program_status'),
               nullable=False)
    op.alter_column('workout_programs', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.alter_column('workout_programs', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('workout_programs', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('workout_programs', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('workout_programs', 'status',
               existing_type=postgresql.ENUM('active', 'archived', name='program_status'),
               nullable=True)
    # ### end Alembic commands ###