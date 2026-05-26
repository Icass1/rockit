import asyncio
import os
from dataclasses import dataclass
from importlib import import_module
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Awaitable, Callable, List, Set, TypeVar

from sqlalchemy import Connection, Inspector, Table, UniqueConstraint, text, inspect
from sqlalchemy.engine.cursor import CursorResult
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.sql.base import Executable

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it
from backend.core.access.db.base import CoreBase

from backend.core.access.db.ormModels.declarativeMixin import triggers

T = TypeVar("T")

logger = getLogger(__name__)


@dataclass
class SchemaInfo:
    name: str
    base: Any


schemas: List[SchemaInfo] = []

modules: List[str] = []

for dirpath, dirnames, filenames in os.walk("backend"):
    if not dirpath.endswith("/db"):
        continue

    if "db.py" not in filenames:
        logger.warning(f"db.py not found inside db folder in {dirpath}")
        continue

    base = ".".join(dirpath.split("/"))
    module = f"{base}.db"
    modules.append(module)

modules_sorted: List[str] = sorted(
    modules, key=lambda x: (0 if "core" in x else 1, x)  # "core" gets 0, others 1
)

for module in modules_sorted:
    logger.info(f"Importing module {module}")
    module = import_module(module)

    try:
        for schema in module.schemas:
            schemas.append(SchemaInfo(name=schema, base=module.base))
    except Exception as e:
        logger.exception(msg=f"{module} doesn't have an schemas variable declared")


SET_UPDATED_TIMESTAMP_STMT = """
CREATE OR REPLACE FUNCTION core.set_updated_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""


class ResilientAsyncSession(AsyncSession):
    """AsyncSession that auto-recovers from aborted transactions.

    When a SQL query fails, the asyncpg transaction enters an aborted state
    where all subsequent commands are rejected. ``is_active`` still returns
    ``True`` because only the asyncpg-level transaction is invalidated — the
    SQLAlchemy-level transaction object is not rolled back until explicitly
    told to.

    This subclass catches ``InFailedSQLTransactionError`` inside ``execute()``,
    rolls back the aborted transaction, and retries the statement once so that
    the calling code sees the *original* error (e.g. a constraint violation)
    instead of a confusing cascaded failure.
    """

    async def execute(
        self,
        statement: Executable,
        params: Any = None,
        **kw: Any,
    ) -> CursorResult[Any]:
        if not self.is_active:
            await self.rollback()
        try:
            return await super().execute(statement, params, **kw)  # type: ignore  # noqa: PGH003
        except DBAPIError as e:
            # Check if the underlying asyncpg transaction was aborted by a
            # prior failed statement. If so, roll back and retry so the
            # caller gets the original error instead of a confusing
            # "current transaction is aborted" message.
            if hasattr(e, "orig") and "current transaction is aborted" in str(e.orig):
                await self.rollback()
                return await super().execute(statement, params, **kw)  # type: ignore  # noqa: PGH003
            raise


class RockItDB:
    @time_it
    def __init__(
        self,
        username: str,
        password: str,
        host: str,
        port: int,
        database: str,
        verbose: bool = False,
    ):
        """
        Initialize the RockItDB instance and create a database session.
        """
        self.database: str = database

        connection_string = (
            f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{self.database}"
        )

        logger.info(f"Using connection string '{connection_string}'")

        self.engine: AsyncEngine = create_async_engine(
            url=connection_string,
            echo=verbose,
        )

    @time_it
    async def async_init(self):
        await self.create_schemas()

        # Create tables with run_sync (single call — all bases share the same metadata)
        async with self.engine.begin() as conn:
            await conn.run_sync(CoreBase.metadata.create_all)

        # Now set SessionLocal AFTER tables are created
        self.SessionLocal = async_sessionmaker(
            bind=self.engine, class_=ResilientAsyncSession, expire_on_commit=False
        )

        logger.info("SessionLocal initialized.")

        # Check schemas (run sync for simplicity during init)
        for mapper in CoreBase.registry.mappers:
            await self.check_table_schema_async(mapper.class_.__table__)

        for table in CoreBase.metadata.tables.values():
            if not any(
                mapper.class_.__table__ is table for mapper in CoreBase.registry.mappers
            ):
                await self.check_table_schema_async(table)

    async def create_schemas(self):
        """TODO"""

        async with self.engine.begin() as conn:
            for schema in schemas:
                await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema.name}"))
            await conn.commit()

    async def drop_schemas(self):
        """TODO"""

        async with self.engine.begin() as conn:
            for schema in schemas:
                await conn.execute(text(f"DROP SCHEMA IF EXISTS {schema.name} CASCADE"))
            await conn.commit()

    async def after_all_providers_tables_init(self):
        """TODO"""

        async with self.engine.begin() as conn:
            for trigger in triggers:
                await conn.execute(text(trigger))
            await conn.commit()

    @time_it
    async def check_table_schema_async(self, table: Table):
        """Compare ORM Table definition vs actual database table for async engine."""

        logger.debug(f"Comparing {table.name} ORM with database...")

        async with self.engine.begin() as conn:

            def do_check(sync_conn: Connection):
                inspector: Inspector = inspect(sync_conn)

                schema = table.schema
                if not schema:
                    logger.critical(f"Schema of table {table.name} is None.")
                    return

                table_name = table.name

                # --- Columns ---
                try:
                    db_columns = {
                        col["name"]: col
                        for col in inspector.get_columns(table_name, schema=schema)
                    }
                except Exception as e:
                    logger.error(f"Table not found in DB: {schema}.{table_name} ({e})")
                    return

                orm_columns = {col.name: col for col in table.columns}

                # Column existence
                for col in orm_columns.keys() - db_columns.keys():
                    logger.error(
                        f"ORM-only column: {col} in table '{table.schema}.{table.name}'"
                    )
                for col in db_columns.keys() - orm_columns.keys():
                    logger.error(
                        f"DB-only column: {col} in table '{table.schema}.{table.name}'"
                    )

                # Type mismatch
                for col in orm_columns.keys() & db_columns.keys():
                    orm_type = str(orm_columns[col].type)
                    db_type = str(db_columns[col]["type"])

                    # Normalize common PostgreSQL type equivalences
                    normalised_orm = orm_type.lower().replace(
                        "double precision", "float"
                    )
                    normalised_db = db_type.lower().replace("double precision", "float")

                    if normalised_orm != normalised_db:
                        logger.error(
                            f"Type mismatch on {col}: ORM={orm_type}, DB={db_type} in table '{table.schema}.{table.name}'"
                        )

                # Foreign keys
                orm_fks: Set[str] = set()
                for col in table.columns:
                    for fk in col.foreign_keys:
                        orm_fks.add(f"{table_name}.{col.name} -> {fk.target_fullname}")

                db_fks: Set[str] = set()
                for fk in inspector.get_foreign_keys(table_name, schema=schema):
                    for local, remote in zip(
                        fk["constrained_columns"], fk["referred_columns"]
                    ):
                        db_fks.add(
                            f"{table_name}.{local} -> {fk['referred_schema']}.{fk['referred_table']}.{remote}"
                        )

                for fk in orm_fks - db_fks:
                    logger.error(
                        f"ForeignKey in ORM but missing in DB: {fk} in table '{table.schema}.{table.name}'"
                    )
                for fk in db_fks - orm_fks:
                    logger.error(
                        f"ForeignKey in DB but missing in ORM: {fk} in table '{table.schema}.{table.name}'"
                    )

                # Unique constraints
                orm_uqs: Set[frozenset[str]] = set()
                for col in table.columns:
                    if col.unique:
                        orm_uqs.add(frozenset([col.name]))
                for constraint in table.constraints:
                    if isinstance(constraint, UniqueConstraint):
                        col_names = [c.name for c in constraint.columns]
                        orm_uqs.add(frozenset(col_names))

                db_uqs: Set[frozenset[str]] = {
                    frozenset(uq["column_names"])
                    for uq in inspector.get_unique_constraints(
                        table_name, schema=schema
                    )
                }

                for uq in orm_uqs - db_uqs:
                    logger.error(
                        f"Unique constraint in ORM but missing in DB: {sorted(uq)} in table '{table.schema}.{table.name}'"
                    )
                for uq in db_uqs - orm_uqs:
                    logger.error(
                        f"Unique constraint in DB but missing in ORM: {sorted(uq)} in table '{table.schema}.{table.name}'"
                    )

            # Run sync inspection inside async connection
            await conn.run_sync(do_check)

    def get_session(self) -> AsyncSession:
        """Create a new async database session. Must be closed by the caller."""
        return self.SessionLocal()

    async def close(self) -> None:
        """Dispose of the async engine."""
        await self.engine.dispose()

    async def wait_for_session_local_async(self) -> None:
        """Wait until SessionLocal is initialized."""
        logger.debug("Waiting for SessionLocal to be initialized...")
        while not hasattr(self, "SessionLocal"):
            await asyncio.sleep(0.1)

        logger.debug("SessionLocal is now initialized.")

    @asynccontextmanager
    async def session_scope_async(self) -> AsyncGenerator[AsyncSession, None]:
        """Provide a transactional scope around async operations."""
        session: AsyncSession = self.get_session()
        try:
            yield session
            if session.is_active:
                await session.commit()
            else:
                await session.rollback()
        except Exception as e:
            logger.exception(f"Error executing query ({e}). Rolling back...")
            await session.rollback()
            raise
        finally:
            await session.close()

    async def execute_with_session(
        self, func: Callable[[AsyncSession], Awaitable[T]]
    ) -> T:
        """Execute a function with an async session, auto-closing and rolling back on errors."""
        async with self.session_scope_async() as session:
            return await func(session)

    async def reinit(self):
        logger.info("Dropping schemas...")
        await self.drop_schemas()
        logger.info("All schemas dropped")

        logger.info("Creating schemas...")
        await self.create_schemas()
        logger.info("All schemas created")

        async with self.engine.begin() as conn:
            await conn.run_sync(CoreBase.metadata.create_all)
