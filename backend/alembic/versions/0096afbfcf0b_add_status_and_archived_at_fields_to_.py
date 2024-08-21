"""Add status and archived_at fields to workout program

Revision ID: 0096afbfcf0b
Revises: 2db9e5beb61e
Create Date: 2024-08-19 16:37:51.916932

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0096afbfcf0b'
down_revision: Union[str, None] = '2db9e5beb61e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('workout_programs', sa.Column('status', sa.Enum('active', 'archived', name='program_status'), nullable=True))
    op.add_column('workout_programs', sa.Column('archived_at', sa.DateTime(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('workout_programs', 'archived_at')
    op.drop_column('workout_programs', 'status')
    # ### end Alembic commands ###
