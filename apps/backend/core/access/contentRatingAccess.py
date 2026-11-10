from sqlalchemy import Boolean, Integer, String, cast, column, func, select, update, values
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


class ContentRatingAccess:
    @staticmethod
    @safe_async
    async def get_batch_async(
        session: AsyncSession, public_ids: list[str]
    ) -> Result[dict[str, CoreMediaRow]]:
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result={})
        rows = await session.execute(
            select(CoreMediaRow)
            .execution_options(populate_existing=True)
            .where(
                CoreMediaRow.public_id.in_(public_ids),
                CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
            )
        )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result={row.public_id: row for row in rows.scalars().all()},
        )

    @staticmethod
    @safe_async
    async def record_async(
        session: AsyncSession, media_id: int, is_explicit: bool | None, source: str, is_manual: bool
    ) -> ResultCode:
        statement = update(CoreMediaRow).where(
            CoreMediaRow.id == media_id, CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value
        )
        if not is_manual:
            statement = statement.where(CoreMediaRow.explicit_manual.is_(False))
            if is_explicit is None:
                statement = statement.where(CoreMediaRow.is_explicit.is_(None))
        await session.execute(
            statement.values(
                is_explicit=is_explicit,
                explicit_source=source,
                explicit_manual=is_manual,
                date_updated=func.now(),
            )
        )
        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def record_batch_async(
        session: AsyncSession, evidence: list[tuple[int, bool | None, str]]
    ) -> ResultCode:
        if not evidence:
            return ResultCode(code=ResultCode.OK, message="OK")
        data = values(
            column("media_id", Integer),
            column("flag", Boolean),
            column("source", String),
            name="rating_evidence",
        ).data([(media_id, cast(flag, Boolean), source) for media_id, flag, source in evidence])
        await session.execute(
            update(CoreMediaRow)
            .where(
                CoreMediaRow.id == data.c.media_id,
                CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                CoreMediaRow.explicit_manual.is_(False),
                data.c.flag.is_not(None) | CoreMediaRow.is_explicit.is_(None),
            )
            .values(is_explicit=data.c.flag, explicit_source=data.c.source, date_updated=func.now())
            .execution_options(synchronize_session=False)
        )
        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def page_songs_async(
        session: AsyncSession, after: str, limit: int
    ) -> Result[list[CoreMediaRow]]:
        rows = await session.execute(
            select(CoreMediaRow)
            .where(
                CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                CoreMediaRow.public_id > after,
            )
            .order_by(CoreMediaRow.public_id)
            .limit(limit)
        )
        return Result(code=ResultCode.OK, message="OK", result=list(rows.scalars().all()))
