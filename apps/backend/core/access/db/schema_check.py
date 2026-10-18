"""ORM and database schema comparison helpers."""

from sqlalchemy import Connection, Inspector, Table, UniqueConstraint, inspect
from sqlalchemy.ext.asyncio import AsyncEngine

from backend.utils.logger import getLogger

logger = getLogger(__name__)


async def check_table_schema_async(engine: AsyncEngine, table: Table) -> None:
    """Compare an ORM table definition with the actual database table."""

    logger.debug(f"Comparing {table.name} ORM with database...")

    async with engine.begin() as conn:

        def do_check(sync_conn: Connection) -> None:
            inspector: Inspector = inspect(sync_conn)

            schema = table.schema
            if not schema:
                logger.critical(f"Schema of table {table.name} is None.")
                return

            table_name = table.name

            try:
                db_columns = {
                    col["name"]: col
                    for col in inspector.get_columns(table_name, schema=schema)
                }
            except Exception as e:
                logger.error(f"Table not found in DB: {schema}.{table_name} ({e})")
                return

            orm_columns = {col.name: col for col in table.columns}

            for col in orm_columns.keys() - db_columns.keys():
                logger.error(
                    f"ORM-only column: {col} in table '{table.schema}.{table.name}'"
                )
            for col in db_columns.keys() - orm_columns.keys():
                logger.error(
                    f"DB-only column: {col} in table '{table.schema}.{table.name}'"
                )

            for col in orm_columns.keys() & db_columns.keys():
                orm_type = str(orm_columns[col].type)
                db_type = str(db_columns[col]["type"])

                normalised_orm = orm_type.lower().replace("double precision", "float")
                normalised_db = db_type.lower().replace("double precision", "float")

                if normalised_orm != normalised_db:
                    logger.error(
                        f"Type mismatch on {col}: ORM={orm_type}, DB={db_type} in table "
                        f"'{table.schema}.{table.name}'"
                    )

                orm_nullable = orm_columns[col].nullable
                db_nullable = db_columns[col]["nullable"]
                if orm_nullable != db_nullable:
                    logger.error(
                        f"Nullable mismatch on {col}: ORM={orm_nullable}, DB={db_nullable} "
                        f"in table '{table.schema}.{table.name}'"
                    )

            orm_fks: set[str] = set()
            for col in table.columns:
                for fk in col.foreign_keys:
                    orm_fks.add(f"{table_name}.{col.name} -> {fk.target_fullname}")

            db_fks: set[str] = set()
            try:
                for fk in inspector.get_foreign_keys(table_name, schema=schema):
                    for local, remote in zip(
                        fk["constrained_columns"], fk["referred_columns"]
                    ):
                        db_fks.add(
                            f"{table_name}.{local} -> {fk['referred_schema']}."
                            f"{fk['referred_table']}.{remote}"
                        )
            except Exception as e:
                logger.error(
                    f"Could not read foreign keys for table '{schema}.{table_name}' ({e})"
                )

            for fk in orm_fks - db_fks:
                logger.error(
                    f"ForeignKey in ORM but missing in DB: {fk} in table "
                    f"'{table.schema}.{table.name}'"
                )
            for fk in db_fks - orm_fks:
                logger.error(
                    f"ForeignKey in DB but missing in ORM: {fk} in table "
                    f"'{table.schema}.{table.name}'"
                )

            orm_uqs: set[frozenset[str]] = set()
            for col in table.columns:
                if col.unique:
                    orm_uqs.add(frozenset([col.name]))
            for constraint in table.constraints:
                if isinstance(constraint, UniqueConstraint):
                    orm_uqs.add(frozenset(c.name for c in constraint.columns))

            db_uqs: set[frozenset[str]] = set()
            try:
                db_uqs = {
                    frozenset(uq["column_names"])
                    for uq in inspector.get_unique_constraints(
                        table_name, schema=schema
                    )
                }
            except Exception as e:
                logger.error(
                    f"Could not read unique constraints for table '{schema}.{table_name}' ({e})"
                )

            for uq in orm_uqs - db_uqs:
                logger.error(
                    f"Unique constraint in ORM but missing in DB: {sorted(uq)} in table "
                    f"'{table.schema}.{table.name}'"
                )
            for uq in db_uqs - orm_uqs:
                logger.error(
                    f"Unique constraint in DB but missing in ORM: {sorted(uq)} in table "
                    f"'{table.schema}.{table.name}'"
                )

        await conn.run_sync(do_check)
