"""Add player_xp to users (overall-level track for the habit overhaul)

Note: the new habit tables (buckets, habits, habit_logs) are created by
Base.metadata.create_all() on startup, consistent with how this project bootstraps new
tables. This migration covers the one change create_all can't make — adding a column to the
pre-existing users table. Guarded so it's safe on databases where the column already exists.

Revision ID: b1c2d3e4f5a6
Revises: a474debf6e34
Create Date: 2026-06-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'a474debf6e34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "player_xp" not in columns:
        op.add_column(
            "users",
            sa.Column("player_xp", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = {c["name"] for c in inspector.get_columns("users")}
    if "player_xp" in columns:
        op.drop_column("users", "player_xp")
