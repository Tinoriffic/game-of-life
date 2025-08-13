"""add_timezone_to_users

Revision ID: e23f852b127e
Revises: 6f0b38a000a5
Create Date: 2025-08-12 21:41:29.226865

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e23f852b127e'
down_revision: Union[str, None] = '6f0b38a000a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add timezone column to users table with default 'UTC'
    op.add_column('users', sa.Column('timezone', sa.String(), nullable=False, server_default='UTC'))


def downgrade() -> None:
    # Remove timezone column from users table
    op.drop_column('users', 'timezone')
