"""Add notes to UserActivities

Revision ID: 46d2f6c38e51
Revises: 4580ee8020d6
Create Date: 2024-02-24 22:29:55.553730

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '46d2f6c38e51'
down_revision: Union[str, None] = '4580ee8020d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('user_activities', sa.Column('notes', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('user_activities', 'notes')
    # ### end Alembic commands ###