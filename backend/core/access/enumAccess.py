from enum import Enum
from typing import Sequence, Tuple, Type
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, Select, select, asc

from backend.core.access.db import rockit_db
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class EnumAccess:
    @staticmethod
    async def check_enum_contents_async(
        enum_class: Type[Enum],
        table: type[BaseEnumRow], 
        session: AsyncSession | None = None
    ) -> None:
        """
        Ensures full DB-Enum consistency:
        - DB keys match enum numeric values exactly.
        - DB entry names match enum names.
        - DB must contain a prefix of the enum; only additions allowed.
        """
        async with rockit_db.session_scope_or_session_async(possible_session=session) as s:
            stmt: Select[Tuple[BaseEnumRow]] = select(
                table).order_by(asc(table.key))
            result: Result[Tuple[BaseEnumRow]] = await s.execute(stmt)
            db_rows: Sequence[BaseEnumRow] = result.scalars().all()

            # Extract DB keys and values.
            db_keys: list[int] = [row.key for row in db_rows]
            db_values: list[str] = [row.value for row in db_rows]

            # Extract enum keys and values.
            enum_items = list(enum_class.__members__.items())
            enum_keys: list[int] = [member.value for _, member in enum_items]
            enum_values: list[str] = [name for name, _ in enum_items]

            # Ensure enum keys are strictly increasing (safety check).
            if enum_keys != sorted(enum_keys):
                raise ValueError(
                    f"Enum {enum_class.__name__} must use increasing integer values (0,1,2,...)."
                )

            # --- CHECK 1: Prefix match of keys ---
            if db_keys != enum_keys[:len(db_keys)]:
                raise ValueError(
                    f"Key mismatch for {table.__name__}. "
                    f"DB keys={db_keys} do not match enum keys prefix={enum_keys[:len(db_keys)]}. "
                    "Only additions are allowed."
                )

            # --- CHECK 2: Prefix match of names ---
            if db_values != enum_values[:len(db_values)]:
                raise ValueError(
                    f"Enum name mismatch for {table.__name__}. "
                    f"DB values={db_values} do not match enum names prefix={enum_values[:len(db_values)]}. "
                    "Only additions are allowed."
                )

            # --- ADD MISSING VALUES ---
            missing_count = len(enum_keys) - len(db_keys)
            if missing_count > 0:
                for i in range(len(db_keys), len(enum_keys)):
                    new_row = table(value=enum_values[i], key=enum_keys[i])
                    s.add(new_row)
                await s.commit()
