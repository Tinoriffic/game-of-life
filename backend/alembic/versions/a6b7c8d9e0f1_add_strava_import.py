"""Add Strava import: connections + activity ledger + habit_log provenance

New tables (strava_connections, strava_activity_imports) are also created by
Base.metadata.create_all() on startup, consistent with this project's bootstrap;
this migration keeps Alembic's history coherent for prod and adds the two
habit_logs columns create_all can't add to the existing table. All guarded so
it's safe where the bootstrap already ran. env.py re-enables RLS on the new
tables after this runs.

Revision ID: a6b7c8d9e0f1
Revises: f5a6b7c8d9e0
Create Date: 2026-07-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    tables = set(inspector.get_table_names())

    habit_log_cols = {c["name"] for c in inspector.get_columns("habit_logs")}
    if "source" not in habit_log_cols:
        op.add_column("habit_logs",
                      sa.Column("source", sa.String(), nullable=False, server_default="manual"))
    if "external_ref" not in habit_log_cols:
        op.add_column("habit_logs", sa.Column("external_ref", sa.String(), nullable=True))
        op.create_index("ix_habit_logs_external_ref", "habit_logs", ["external_ref"])

    if "strava_connections" not in tables:
        op.create_table(
            "strava_connections",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(),
                      sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
            sa.Column("athlete_id", sa.BigInteger(), nullable=False, unique=True),
            sa.Column("access_token", sa.String(), nullable=False),
            sa.Column("refresh_token", sa.String(), nullable=False),
            sa.Column("expires_at", sa.Integer(), nullable=False),
            sa.Column("scope", sa.String(), nullable=True),
            sa.Column("target_habit_id", sa.Integer(),
                      sa.ForeignKey("habits.id", ondelete="SET NULL"), nullable=True),
            sa.Column("import_rides", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("last_synced_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_strava_connections_user_id", "strava_connections", ["user_id"])
        op.create_index("ix_strava_connections_athlete_id", "strava_connections", ["athlete_id"])

    if "strava_activity_imports" not in tables:
        op.create_table(
            "strava_activity_imports",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("connection_id", sa.Integer(),
                      sa.ForeignKey("strava_connections.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(),
                      sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("activity_id", sa.BigInteger(), nullable=False),
            sa.Column("sport_type", sa.String(), nullable=True),
            sa.Column("log_date", sa.String(), nullable=True),
            sa.Column("distance_miles", sa.Float(), nullable=True),
            sa.Column("duration_minutes", sa.Float(), nullable=True),
            sa.Column("habit_log_id", sa.Integer(),
                      sa.ForeignKey("habit_logs.id", ondelete="SET NULL"), nullable=True),
            sa.Column("imported_at", sa.DateTime(), nullable=True),
            sa.UniqueConstraint("user_id", "activity_id", name="uq_strava_activity_per_user"),
        )
        op.create_index("ix_strava_activity_imports_connection_id",
                        "strava_activity_imports", ["connection_id"])
        op.create_index("ix_strava_activity_imports_user_id",
                        "strava_activity_imports", ["user_id"])


def downgrade() -> None:
    from sqlalchemy import inspect
    conn = op.get_bind()
    tables = set(inspect(conn).get_table_names())
    if "strava_activity_imports" in tables:
        op.drop_table("strava_activity_imports")
    if "strava_connections" in tables:
        op.drop_table("strava_connections")
    habit_log_cols = {c["name"] for c in inspect(conn).get_columns("habit_logs")}
    if "external_ref" in habit_log_cols:
        op.drop_index("ix_habit_logs_external_ref", table_name="habit_logs")
        op.drop_column("habit_logs", "external_ref")
    if "source" in habit_log_cols:
        op.drop_column("habit_logs", "source")
