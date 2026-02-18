from typing import Type
from enum import Enum
from backend.core.access.db import rockit_db
from backend.core.access.db.enums.baseEnum import BaseEnumRow


class EnumAccess:

    @staticmethod
    def check_enum_contents(enum_class: Type[Enum], table: type[BaseEnumRow]) -> None:
        """
        Ensures the DB table contains exactly the enum values, allowing only additions.
        If existing DB rows do not match enum names (or mismatch order), raises an error.
        """

        with rockit_db.session_scope() as s:
            # Step 1 — Load all DB values in key order
            db_rows = s.query(table).order_by(table.key).all()
            db_values: list[str] = [row.value for row in db_rows]

            # Step 2 — Enum values from Python (stable ordering)
            enum_values: list[str] = list(enum_class.__members__.keys())

            # Step 3 — Existing DB values must be a prefix of the enum
            if db_values != enum_values[: len(db_values)]:
                raise ValueError(
                    f"Enum mismatch detected for {table.__name__}. "
                    f"Database values={db_values} do not match enum prefix={enum_values[:len(db_values)]}. "
                    "Only additions at the end are allowed."
                )

            # Step 4 — Add missing values
            missing_values = enum_values[len(db_values):]

            for value in missing_values:
                s.add(table(value=value))

            if missing_values:
                s.commit()
