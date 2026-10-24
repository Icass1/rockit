#!/usr/bin/env python3
"""Generate or apply SQL for schema mismatches reported by Rockit's checker.

The default mode is a dry run: it prints SQL for review. Use --apply to execute
the generated statements against the configured database. Only default-value
mismatches are repairable automatically; structural differences need a
migration tailored to the affected table and data.

Example:
    python scripts/fix_schema_differences.py schema-check.log > fixes.sql
    python scripts/fix_schema_differences.py schema-check.log --apply
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from collections.abc import Iterable
from pathlib import Path

from sqlalchemy import text

from backend.core.access.db.rockItDb import rockit_db

IDENTIFIER = r'"(?:[^"]|"")+"'
TABLE_RE = re.compile(rf"in table '({IDENTIFIER})\.({IDENTIFIER})'$")
DEFAULT_RE = re.compile(
    r"Server default mismatch on ([A-Za-z_][A-Za-z0-9_]*): "
    r"ORM=(.*?), DB=(.*?) in table '([^']+)\.([^']+)'$"
)


def quote_identifier(value: str) -> str:
    """Quote a PostgreSQL identifier safely."""

    return '"' + value.replace('"', '""') + '"'


def parse_default(value: str) -> str | None:
    """Translate the checker's normalized default into a SQL expression."""

    value = value.strip()
    if value == "None":
        return None
    if value.lower() in {"true", "false"}:
        return value.lower()
    if re.fullmatch(r"-?(?:\d+(?:\.\d*)?|\.\d+)", value):
        return value
    # The checker normalizes SQL string literals by removing outer quotes.
    # Escape the remaining content as a standard SQL string literal.
    if value and not any(token in value for token in (";", "--", "/*", "*/")):
        return "'" + value.replace("'", "''") + "'"
    raise ValueError(f"Unsupported default expression: {value!r}")


def statements_from_lines(lines: Iterable[str]) -> tuple[list[str], list[str]]:
    """Return safe ALTER statements and mismatch lines needing manual review."""

    statements: set[str] = set()
    manual: list[str] = []
    for line in lines:
        if "Server default mismatch on " not in line:
            if any(
                marker in line
                for marker in (
                    " mismatch ",
                    "only column:",
                    "ForeignKey in ",
                    "Unique constraint ",
                    "Index ",
                )
            ):
                manual.append(line.rstrip())
            continue

        match = DEFAULT_RE.search(line.rstrip())
        if not match:
            manual.append(line.rstrip())
            continue
        column, orm_default, db_default, schema, table = match.groups()
        # This helper only handles values with a literal or no default.
        # Sequence and function expressions are intentionally left for review.
        try:
            expression = parse_default(orm_default)
        except ValueError:
            manual.append(line.rstrip())
            continue
        qualified_table = f"{quote_identifier(schema)}.{quote_identifier(table)}"
        quoted_column = quote_identifier(column)
        if expression is None:
            statement = (
                f"ALTER TABLE {qualified_table} ALTER COLUMN {quoted_column} "
                "DROP DEFAULT;"
            )
        else:
            statement = (
                f"ALTER TABLE {qualified_table} ALTER COLUMN {quoted_column} "
                f"SET DEFAULT {expression};"
            )
        statements.add(statement)

    return sorted(statements), manual


async def apply_statements(statements: list[str]) -> None:
    """Apply generated statements in a single transaction."""

    async with rockit_db.session_scope_async() as session:
        for statement in statements:
            await session.execute(text(statement))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("log", type=Path, help="log file from the schema checker")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="execute generated ALTER statements against the configured database",
    )
    args = parser.parse_args()

    statements, manual = statements_from_lines(
        args.log.read_text(encoding="utf-8").splitlines()
    )
    if statements:
        if args.apply:
            asyncio.run(apply_statements(statements))
            print(f"Applied {len(statements)} default repair(s).", file=sys.stderr)
        else:
            print("-- Review these statements before applying:")
            print("BEGIN;")
            print("\n".join(statements))
            print("COMMIT;")

    if manual:
        print(
            f"-- {len(manual)} mismatch(es) need manual migration review:",
            file=sys.stderr,
        )
        for line in manual:
            print(line, file=sys.stderr)
    if not statements and not manual:
        print("No schema mismatches found.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
