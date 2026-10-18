"""Database engine lifecycle and session management."""

import asyncio
import ssl
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Literal, TypeVar

from sqlalchemy import URL, Table, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from backend.core.access.db.authentication import generate_iam_token
from backend.core.access.db.base import CoreBase
from backend.core.access.db.migrations import (
    MIGRATIONS,
    Migration,
)
from backend.core.access.db.migrations import (
    apply_migrations_async as run_migrations_async,
)
from backend.core.access.db.ormModels.declarativeMixin import triggers
from backend.core.access.db.schema import (
    SET_UPDATED_TIMESTAMP_STMT,
    SchemaInfo,
    schemas,
)
from backend.core.access.db.schema_check import (
    check_table_schema_async as compare_table_schema_async,
)
from backend.core.access.db.session import (
    ResilientAsyncSession,
    reset_owned_sequences_async,
)
from backend.utils.logger import getLogger

logger = getLogger(__name__)

T = TypeVar("T")

__all__ = [
    "MIGRATIONS",
    "SET_UPDATED_TIMESTAMP_STMT",
    "Database",
    "Migration",
    "ResilientAsyncSession",
    "SchemaInfo",
    "reset_owned_sequences_async",
    "schemas",
]


class Database:
    """Manage the asynchronous database engine and application sessions."""

    def __init__(
        self,
        username: str,
        password: str,
        host: str,
        port: int,
        database: str,
        verbose: bool = False,
        *,
        iam_auth: bool = False,
        region: str | None = None,
        sslmode: Literal["disable", "require", "verify-full"] | None = None,
        sslrootcert: str | None = None,
    ) -> None:
        """Initialize the database instance and create its async engine."""

        self.database: str = database
        if iam_auth and not region:
            raise ValueError("A database region is required for IAM authentication")
        if iam_auth and sslmode == "disable":
            raise ValueError("IAM database authentication requires TLS")
        if sslrootcert and sslmode != "verify-full":
            raise ValueError("A root certificate requires sslmode=verify-full")
        connection_url = URL.create(
            "postgresql+asyncpg",
            username=username,
            password=None if iam_auth else password,
            host=host,
            port=port,
            database=database,
        )
        connect_args: dict[str, object] = {}
        effective_sslmode = sslmode or ("require" if iam_auth else None)
        if effective_sslmode == "verify-full":
            connect_args["ssl"] = ssl.create_default_context(cafile=sslrootcert)
        elif effective_sslmode:
            connect_args["ssl"] = effective_sslmode
        if iam_auth:
            assert region is not None
            token_region = region

            async def get_password_async() -> str:
                """Generate a fresh token without blocking the application event loop."""

                return await asyncio.to_thread(
                    generate_iam_token, host, port, username, token_region
                )

            connect_args["password"] = get_password_async
        logger.info(
            f"Using database '{connection_url.render_as_string(hide_password=True)}'"
        )
        self.engine: AsyncEngine = create_async_engine(
            url=connection_url,
            echo=verbose,
            poolclass=NullPool,
            connect_args=connect_args,
        )

    async def async_init(self) -> None:
        """Create the database structure and apply all pending migrations."""

        await self.create_schemas()
        await self.create_extensions()

        async with self.engine.begin() as conn:
            await conn.run_sync(CoreBase.metadata.create_all)

        await self.apply_migrations_async()
        await self.after_all_providers_tables_init()
        async with self.engine.begin() as conn:
            for table in CoreBase.metadata.tables.values():
                for index in table.indexes:
                    if index.name and index.name.startswith("ix_collection_"):
                        await conn.run_sync(index.create, checkfirst=True)
        self.SessionLocal = async_sessionmaker(
            bind=self.engine, class_=ResilientAsyncSession, expire_on_commit=False
        )
        logger.info("SessionLocal initialized.")

        for mapper in CoreBase.registry.mappers:
            await self.check_table_schema_async(mapper.class_.__table__)

        for table in CoreBase.metadata.tables.values():
            if not any(
                mapper.class_.__table__ is table for mapper in CoreBase.registry.mappers
            ):
                await self.check_table_schema_async(table)

    async def create_schemas(self) -> None:
        """Create all schemas declared by the database modules."""

        async with self.engine.begin() as conn:
            for schema in schemas:
                await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema.name}"))
            await conn.commit()

    async def drop_schemas(self) -> None:
        """Drop all declared schemas and their objects."""

        async with self.engine.begin() as conn:
            for schema in schemas:
                await conn.execute(text(f"DROP SCHEMA IF EXISTS {schema.name} CASCADE"))
            await conn.commit()

    async def create_extensions(self) -> None:
        """Enable PostgreSQL extensions required by ORM-defined indexes."""

        async with self.engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            await conn.commit()

    async def apply_migrations_async(self) -> None:
        """Apply all pending migrations through the migration runner."""

        await run_migrations_async(self.engine)

    async def after_all_providers_tables_init(self) -> None:
        """Create the triggers shared by all provider tables."""

        async with self.engine.begin() as conn:
            for trigger in triggers:
                await conn.execute(text(trigger))
            await conn.commit()

    async def check_table_schema_async(self, table: Table) -> None:
        """Compare an ORM table definition with the actual database table."""

        await compare_table_schema_async(self.engine, table)

    def get_session(self) -> AsyncSession:
        """Create a new async database session; the caller must close it."""

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
        """Execute a function with an async session and close it afterward."""

        async with self.session_scope_async() as session:
            return await func(session)

    async def reinit(self) -> None:
        """Drop and recreate the database structure for integration tests."""

        logger.info("Dropping schemas...")
        await self.drop_schemas()
        logger.info("All schemas dropped")
        logger.info("Creating schemas...")
        await self.create_schemas()
        logger.info("All schemas created")
        await self.create_extensions()

        async with self.engine.begin() as conn:
            await conn.run_sync(CoreBase.metadata.create_all)

        await self.apply_migrations_async()
        await self.after_all_providers_tables_init()
        self.SessionLocal = async_sessionmaker(
            bind=self.engine, class_=ResilientAsyncSession, expire_on_commit=False
        )
