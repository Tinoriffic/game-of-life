"""merge_heads

Revision ID: 6f0b38a000a5
Revises: 6882b97cbf5f, b2d5197ea8bf
Create Date: 2025-08-12 21:41:21.139766

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f0b38a000a5'
down_revision: Union[str, None] = ('6882b97cbf5f', 'b2d5197ea8bf')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
