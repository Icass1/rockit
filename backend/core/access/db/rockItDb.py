import asyncio
import os
from dataclasses import dataclass
from importlib import import_module
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Awaitable, Callable, List, Set, TypeVar

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import Connection, Inspector, Table, text, inspect

from backend.utils.logger import getLogger
from backend.core.access.db.base import CoreBase

T = TypeVar("T")

logger = getLogger(__name__)


@dataclass
class SchemaInfo:
    name: str
    base: Any


schemas: List[SchemaInfo] = []

for dirpath, dirnames, filenames in os.walk("backend"):
    if not dirpath.endswith("/db"):
        continue

    if "db.py" not in filenames:
        logger.warning(f"db.py not found inside db folder in {dirpath}")
        continue

    base = ".".join(dirpath.split("/"))
    module = f"{base}.db"
    logger.info(f"Importing module {module}")
    module = import_module(module)

    try:
        for schema in module.schemas:
            schemas.append(SchemaInfo(name=schema, base=module.base))
    except:
        logger.warning(f"{module} doesn't have an schemas variable declared.")


class RockItDB:
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

        self.engine: AsyncEngine = create_async_engine(
            f"postgresql+asyncpg://{username}:{password}@{host}:{port}/{self.database}",
            echo=verbose,
        )

    async def async_init(self):
        await self.create_schemas()

        # Create tables with run_sync
        async with self.engine.begin() as conn:
            for schema_info in schemas:
                await conn.run_sync(schema_info.base.metadata.create_all)

        # Now set SessionLocal AFTER tables are created
        self.SessionLocal = async_sessionmaker(bind=self.engine, expire_on_commit=False)

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
        async with self.engine.begin() as conn:
            for schema in schemas:
                await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema.name}"))
            await conn.commit()

    async def drop_schemas(self):
        async with self.engine.begin() as conn:
            for schema in schemas:
                await conn.execute(text(f"DROP SCHEMA IF EXISTS {schema.name} CASCADE"))
            await conn.commit()

    async def check_table_schema_async(self, table: Table):
        """Compare ORM Table definition vs actual database table for async engine."""

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
                    if orm_type.lower() != db_type.lower():
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
            await session.commit()
        except Exception as e:
            logger.error(f"Error executing query ({e}). Rolling back...")
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

        for schema in schemas:
            await schema.base.metadata.create_all(self.engine)
