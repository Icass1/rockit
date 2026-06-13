from logging import Logger

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.access.db.ormEnums.requestTypeEnum import RequestTypeEnumRow
from backend.core.access.db.ormEnums.requestStatusEnum import RequestStatusEnumRow

logger: Logger = getLogger(__name__)

REQUEST_TYPES: list[str] = [
    "lyrics",
    "title",
    "artist",
    "album",
    "genre",
    "metadata",
    "cover_art",
    "other",
]

REQUEST_STATUSES: list[str] = [
    "pending",
    "accepted",
    "rejected",
]


async def seed_enum_values_async(session: AsyncSession) -> None:
    """Seed enum table values if they don't exist."""

    for idx, value in enumerate(REQUEST_TYPES, start=1):
        result = await session.execute(
            select(RequestTypeEnumRow).where(
                RequestTypeEnumRow.value == value
            )
        )
        if result.scalars().first() is None:
            session.add(RequestTypeEnumRow(key=idx, value=value))
            logger.info(f"Seeded request_type_enum: {value}")

    for idx, value in enumerate(REQUEST_STATUSES, start=1):
        result = await session.execute(
            select(RequestStatusEnumRow).where(
                RequestStatusEnumRow.value == value
            )
        )
        if result.scalars().first() is None:
            session.add(RequestStatusEnumRow(key=idx, value=value))
            logger.info(f"Seeded request_status_enum: {value}")

    await session.commit()
