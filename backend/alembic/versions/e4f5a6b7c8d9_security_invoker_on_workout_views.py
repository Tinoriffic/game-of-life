"""Make workout views run with security_invoker

Views default to the creator's permissions (postgres, which bypasses RLS), so
Supabase's anon PostgREST API could read through them even after RLS was enabled
on the base tables. security_invoker makes each view run with the caller's
rights, so the base-table RLS applies. The backend (postgres) is unaffected.

Guarded with IF EXISTS: the views are created by scripts/create_views.py, not by
migrations, so they may be absent on a freshly built database.

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-07-08

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e4f5a6b7c8d9'
down_revision: Union[str, None] = 'd3e4f5a6b7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VIEWS = ('user_workout_program_details', 'workout_progress_view')


def upgrade() -> None:
    for view in VIEWS:
        op.execute(f'ALTER VIEW IF EXISTS public.{view} SET (security_invoker = true)')


def downgrade() -> None:
    for view in VIEWS:
        op.execute(f'ALTER VIEW IF EXISTS public.{view} RESET (security_invoker)')
