"""Database session helpers."""

from typing import Any

from sqlalchemy import event, text
from sqlalchemy.engine.cursor import CursorResult
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy.sql.base import Executable

from backend.core.access.db.ormModels.declarativeMixin import TableAddedBy


async def reset_owned_sequences_async(session: AsyncSession) -> None:
    """Set every table-owned sequence to the next ID after its table contents."""

    await session.execute(text("""
            DO $$
            DECLARE
                sequence_record RECORD;
                maximum_id BIGINT;
            BEGIN
                FOR sequence_record IN
                    SELECT
                        sequence_namespace.nspname AS sequence_schema,
                        sequence_class.relname AS sequence_name,
                        table_namespace.nspname AS table_schema,
                        table_class.relname AS table_name,
                        table_column.attname AS column_name
                    FROM pg_class AS sequence_class
                    JOIN pg_namespace AS sequence_namespace
                        ON sequence_namespace.oid = sequence_class.relnamespace
                    JOIN pg_depend AS dependency
                        ON dependency.objid = sequence_class.oid
                        AND dependency.deptype IN ('a', 'i')
                    JOIN pg_class AS table_class
                        ON table_class.oid = dependency.refobjid
                    JOIN pg_namespace AS table_namespace
                        ON table_namespace.oid = table_class.relnamespace
                    JOIN pg_attribute AS table_column
                        ON table_column.attrelid = table_class.oid
                        AND table_column.attnum = dependency.refobjsubid
                    WHERE sequence_class.relkind = 'S'
                      AND table_class.relkind IN ('r', 'p')
                      AND sequence_namespace.nspname NOT IN ('pg_catalog', 'information_schema')
                LOOP
                    EXECUTE format(
                        'SELECT max(%I) FROM %I.%I',
                        sequence_record.column_name,
                        sequence_record.table_schema,
                        sequence_record.table_name
                    ) INTO maximum_id;

                    EXECUTE format(
                        'SELECT setval(%L::regclass, $1, $2)',
                        format(
                            '%I.%I',
                            sequence_record.sequence_schema,
                            sequence_record.sequence_name
                        )
                    ) USING COALESCE(maximum_id, 1), maximum_id IS NOT NULL;
                END LOOP;
            END $$;
            """))


class ResilientAsyncSession(AsyncSession):
    """AsyncSession that auto-recovers from aborted transactions."""

    async def execute(
        self,
        statement: Executable,
        params: Any = None,  # noqa: ANN401
        **kw: Any,  # noqa: ANN401
    ) -> CursorResult[Any]:
        """Execute a statement and retry once after an aborted transaction."""

        if not self.is_active:
            await self.rollback()
        try:
            return await super().execute(statement, params, **kw)  # type: ignore  # noqa: PGH003
        except DBAPIError as e:
            if hasattr(e, "orig") and "current transaction is aborted" in str(e.orig):
                await self.rollback()
                return await super().execute(statement, params, **kw)  # type: ignore  # noqa: PGH003
            raise


@event.listens_for(Session, "before_flush")
def set_added_by(session: Session, flush_context: object, instances: object) -> None:
    """Attribute newly inserted objects to this session's authenticated user."""
    user_id = session.info.get("added_by")
    if user_id is None:
        return
    for row in session.new:
        if isinstance(row, TableAddedBy) and row.added_by is None:
            row.added_by = user_id
