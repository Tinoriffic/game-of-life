"""Row-level security enforcement for the public schema.

Supabase auto-exposes every table in `public` through its PostgREST API, which
is reachable with the public anon key and bypasses our FastAPI auth entirely.
With RLS disabled, that API can read/write everything. We enable RLS on every
public table and add NO policies: the backend connects as `postgres`
(BYPASSRLS + table owner) so it is unaffected, while the anon/authenticated
PostgREST roles are denied by default. FastAPI stays the only policy layer.

Event triggers would auto-cover new tables, but creating them needs a superuser,
which Supabase's `postgres` role is not. Instead, Alembic's env re-runs this
sweep after each migration (owner-only ALTER, no superuser needed), so tables
added by future migrations are covered without any manual step.
"""
from sqlalchemy import text
from sqlalchemy.engine import Connection


def enable_rls_on_all_public_tables(connection: Connection) -> list[str]:
    """Enable RLS on every public base table that lacks it.

    Idempotent and owner-only. Returns the names of the tables changed.
    No-ops on non-PostgreSQL backends (e.g. a SQLite test DB).
    """
    if connection.dialect.name != "postgresql":
        return []

    tables = connection.execute(text(
        "SELECT tablename FROM pg_tables "
        "WHERE schemaname = 'public' AND rowsecurity = false "
        "ORDER BY tablename"
    )).scalars().all()

    for table in tables:
        # table names come from the catalog, not user input; quote defensively.
        connection.execute(text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY'))

    return list(tables)
