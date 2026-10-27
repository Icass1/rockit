"""Replaceable SQLAlchemy session doubles for fast controller and access tests."""

from collections.abc import AsyncGenerator, Iterator, Sequence
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from itertools import count
from typing import Any, cast

from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ClauseElement


class RecordedResult:
    """Small result object with the access patterns used by the backend."""

    def __init__(self, rows: Sequence[Any] = ()) -> None:
        """Store predetermined rows for one execute call."""
        self.rows = list(rows)

    def scalars(self) -> "RecordedResult":
        """Expose the first item of tuple rows, like SQLAlchemy's scalar result."""
        return RecordedResult([row[0] if isinstance(row, tuple) else row for row in self.rows])

    def all(self) -> list[Any]:
        """Return all predetermined rows."""
        return self.rows

    def __iter__(self) -> Iterator[Any]:
        """Iterate predetermined rows like SQLAlchemy's scalar result."""
        return iter(self.rows)

    def first(self) -> Any | None:  # noqa: ANN401
        """Return the first row or None."""
        return self.rows[0] if self.rows else None

    def one(self) -> Any:  # noqa: ANN401
        """Return exactly one row, raising when the configured result is empty."""
        if len(self.rows) != 1:
            raise AssertionError(f"Expected one row, got {len(self.rows)}")
        return self.rows[0]

    def one_or_none(self) -> Any | None:  # noqa: ANN401
        """Return the sole row or None and reject ambiguous results."""
        if len(self.rows) > 1:
            raise AssertionError(f"Expected at most one row, got {len(self.rows)}")
        return self.first()

    def scalar(self) -> Any | None:  # noqa: ANN401
        """Return the first scalar value."""
        row = self.first()
        value: Any = row
        if isinstance(row, tuple):
            value = cast(Any, row[0])
        return value

    def scalar_one(self) -> Any:  # noqa: ANN401
        """Return the only scalar value, rejecting empty or multiple results."""
        if len(self.rows) != 1:
            raise AssertionError(f"Expected one row, got {len(self.rows)}")
        return self.scalar()

    def scalar_one_or_none(self) -> Any | None:  # noqa: ANN401
        """Return the sole scalar value or None."""
        if len(self.rows) > 1:
            raise AssertionError(f"Expected at most one row, got {len(self.rows)}")
        return self.scalar()


class RecordingSession:
    """Record compiled SQL and return rows configured by each test."""

    def __init__(self, results: Sequence[Sequence[Any]] = ()) -> None:
        """Create a query recorder with optional sequential execute results."""
        self.statements: list[str] = []
        self.parameters: list[dict[str, Any]] = []
        self._results = [list(rows) for rows in results]
        self._scripted_results: list[tuple[str, dict[str, Any], list[Any]]] = []
        self._added: list[Any] = []
        self._ids = count(1)
        self.info: dict[str, Any] = {}

    async def execute(
        self,
        statement: ClauseElement,
        params: object | None = None,
        **kwargs: object,
    ) -> RecordedResult:
        """Record PostgreSQL SQL and return the next configured result."""
        del kwargs
        compiled = statement.compile(
            dialect=postgresql.dialect(), compile_kwargs={"render_postcompile": True}
        )
        self.statements.append(str(compiled))
        parameters = dict(compiled.params or {})
        if isinstance(params, dict):
            parameters.update(params)  # type: ignore[arg-type]
        self.parameters.append(parameters)
        for index, (sql_fragment, expected_parameters, rows) in enumerate(self._scripted_results):
            if sql_fragment in str(compiled) and all(
                parameters.get(key) == value for key, value in expected_parameters.items()
            ):
                del self._scripted_results[index]
                return RecordedResult(rows)
        if self._scripted_results:
            expected = ", ".join(fragment for fragment, _, _ in self._scripted_results)
            raise AssertionError(
                f"No scripted SQL result matched statement; pending query fragments: {expected}\n"
                f"Statement: {compiled}\nParameters: {parameters}"
            )
        rows = self._results.pop(0) if self._results else []
        return RecordedResult(rows)

    def when(
        self,
        sql_fragment: str,
        rows: Sequence[Any],
        parameters: dict[str, Any] | None = None,
    ) -> None:
        """Return explicit rows when compiled SQL and optional binds match a query."""
        self._scripted_results.append((sql_fragment, parameters or {}, list(rows)))

    def assert_all_scripts_consumed(self) -> None:
        """Assert that every query result configured with when() was used."""
        if self._scripted_results:
            fragments = ", ".join(fragment for fragment, _, _ in self._scripted_results)
            raise AssertionError(f"Unused scripted SQL results: {fragments}")

    async def scalar(self, statement: ClauseElement, **kwargs: object) -> Any | None:  # noqa: ANN401
        """Execute a statement and return its first scalar value."""
        return (await self.execute(statement, **kwargs)).scalar()

    async def scalars(self, statement: ClauseElement, **kwargs: object) -> RecordedResult:
        """Execute a statement and expose its scalar rows like AsyncSession.scalars."""
        return (await self.execute(statement, **kwargs)).scalars()

    def add(self, instance: object) -> None:
        """Collect a newly added ORM row without persisting it."""
        self._added.append(instance)

    def add_all(self, instances: Sequence[Any]) -> None:
        """Collect multiple ORM rows without persisting them."""
        self._added.extend(instances)

    async def refresh(
        self, instance: object, attribute_names: Sequence[str] | None = None, **kwargs: object
    ) -> None:
        """Apply defaults that SQLAlchemy refresh would obtain from PostgreSQL."""
        from core.utils.backendUtils import create_id

        del attribute_names
        if kwargs:
            raise TypeError(f"Unexpected refresh arguments: {', '.join(kwargs)}")
        row = cast(Any, instance)
        if hasattr(row, "public_id") and row.public_id is None:
            row.public_id = create_id(32)
        await self.flush()

    async def get(
        self, model: type[Any] | None = None, ident: object | None = None, **kwargs: object
    ) -> object | None:
        """Record a primary-key lookup as SQL and use its configured result."""
        from sqlalchemy import select

        if model is None:
            entity = kwargs.pop("entity", None)
            if not isinstance(entity, type):
                raise TypeError("RecordingSession.get requires a model/entity and ident")
            model = entity
        if ident is None:
            ident = kwargs.pop("ident", None)
        if kwargs:
            raise TypeError(f"Unexpected get arguments: {', '.join(kwargs)}")
        if ident is None:
            raise TypeError("RecordingSession.get requires a model/entity and ident")
        primary_key = next(iter(model.__table__.primary_key.columns))
        return (await self.execute(select(model).where(primary_key == ident))).scalar_one_or_none()

    async def delete(self, instance: object) -> None:
        """Record object deletion; persistence is represented by the session log."""
        del instance

    async def flush(self) -> None:  # type: ignore[no-redef]
        """Assign deterministic IDs and database-default timestamps to added rows."""
        for instance in self._added:
            if getattr(instance, "id", None) is None:
                instance.id = next(self._ids)
            timestamp = datetime(2026, 1, 1, tzinfo=UTC)
            if hasattr(instance, "date_added") and instance.date_added is None:
                instance.date_added = timestamp
            if hasattr(instance, "date_updated") and instance.date_updated is None:
                instance.date_updated = timestamp

    async def commit(self) -> None:
        """Model a commit as flushing pending ORM state without external persistence."""
        await self.flush()

    @asynccontextmanager
    async def session_scope_async(self) -> AsyncGenerator["RecordingSession", None]:
        """Provide a drop-in replacement for the application database scope."""
        yield self

    def rows(self, model: type[Any]) -> list[Any]:
        """Return rows of one mapped class that were explicitly added."""
        return [row for row in self._added if isinstance(row, model)]

    def as_async_session(self) -> AsyncSession:
        """Expose the small test double at the production session boundary."""
        from typing import cast

        return cast(AsyncSession, self)


def statement_parameters(statement: str, parameters: dict[str, Any]) -> tuple[str, dict[str, Any]]:
    """Return an immutable pair for readable SQL and bind parameter assertions."""
    return statement, parameters
