from datetime import datetime
from typing import Any, List

from sqlalchemy import TIMESTAMP, Integer, String, func, event, DDL
from sqlalchemy.orm import mapped_column, declarative_mixin, Mapped, Mapper
from sqlalchemy.schema import Table

from backend.utils.logger import getLogger

logger = getLogger(__name__)


triggers: List[str] = []


@declarative_mixin
class TableDateUpdated:
    date_updated: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=func.now(),
    )


@event.listens_for(Mapper, "mapper_configured")
def add_timestamp_trigger(
    mapper: Mapper[Any],
    class_: type[Any],
) -> None:
    """Attach PostgreSQL trigger for date_updated to every table with the mixin."""

    table: Table = mapper.local_table  # type: ignore
    schema: str | None = table.schema
    table_name = table.name

    # Skip tables without a schema
    if not schema:
        logger.error(f"Schema of table {table_name} is None.")
        return

    disable_update = False
    disable_delete = False

    # If the table has date_updated column → attach auto-update trigger
    if hasattr(class_, "date_updated"):
        trigger_name = f"{table_name}_update_timestamp"
        ddl = DDL(f"""
            CREATE TRIGGER {trigger_name}
            BEFORE UPDATE ON {schema}.{table_name}
            FOR EACH ROW
            EXECUTE FUNCTION core.set_updated_timestamp();
            """)
        event.listen(table, "after_create", ddl)
    else:
        disable_update = True

    if issubclass(class_, TableDisableDelete):
        disable_delete = True

    if disable_update:
        func_name = "no_update"
        trigger_name = f"{table_name}_no_update"
        triggers.append(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_proc
                WHERE proname = '{func_name}'
                AND pronamespace = 'core'::regnamespace
            ) THEN
                EXECUTE '
                CREATE FUNCTION core.{func_name}()
                RETURNS trigger AS $func$
                BEGIN
                    RAISE EXCEPTION ''UPDATEs are not allowed on this table'';
                END;
                $func$ LANGUAGE plpgsql;
                ';
            END IF;
        END;
        $$;
        """)
        triggers.append(f"""
        CREATE TRIGGER {trigger_name}
        BEFORE UPDATE ON {schema}.{table_name}
        FOR EACH ROW
        EXECUTE FUNCTION core.{func_name}();
        """)

    if disable_delete:
        func_name = "no_delete"
        trigger_name = f"{table_name}_no_delete"
        triggers.append(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_proc
                WHERE proname = '{func_name}'
                AND pronamespace = 'core'::regnamespace
            ) THEN
                EXECUTE '
                CREATE FUNCTION core.{func_name}()
                RETURNS trigger AS $func$
                BEGIN
                    RAISE EXCEPTION ''DELETEs are not allowed on this table'';
                END;
                $func$ LANGUAGE plpgsql;
                ';
            END IF;
        END;
        $$;
        """)
        triggers.append(f"""
        CREATE TRIGGER {trigger_name}
        BEFORE DELETE ON {schema}.{table_name}
        FOR EACH ROW
        EXECUTE FUNCTION core.{func_name}();
        """)


class TableDisableDelete:
    pass


@declarative_mixin
class TableDateAdded:
    date_added: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=func.now(),
    )


@declarative_mixin
class TableAutoincrementId:
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )


@declarative_mixin
class TablePublicId:
    public_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)


@declarative_mixin
class TableAutoincrementKey:
    key: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
