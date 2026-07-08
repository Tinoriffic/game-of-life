"""Enable row-level security on all public tables

Supabase exposes every public table through its anon PostgREST API; with RLS
disabled that path bypasses FastAPI's auth. Enable RLS everywhere with no
policies: the backend role (postgres) bypasses RLS and keeps working, while the
anon/authenticated PostgREST roles are denied by default. See app/rls.py.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-07-07

"""
from typing import Sequence, Union

from alembic import op

from app.rls import enable_rls_on_all_public_tables


# revision identifiers, used by Alembic.
revision: str = 'd3e4f5a6b7c8'
down_revision: Union[str, None] = 'c2d3e4f5a6b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    enable_rls_on_all_public_tables(op.get_bind())


def downgrade() -> None:
    # Deliberately irreversible: turning RLS back off would reopen the public
    # API hole, and env.py re-enables it after every migration anyway. Toggle a
    # specific table by hand if that is ever genuinely needed.
    pass
