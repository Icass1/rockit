from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.statsAccess import get_media_info_cte
from core.framework.media.image import Image
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


class MediaSummaryAccess:
    @staticmethod
    @safe_async
    async def images_async(
        session: AsyncSession, public_ids: list[str]
    ) -> Result[dict[str, str | None]]:
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result={})
        sql = text(
            f"WITH {get_media_info_cte()} SELECT public_id, image_id FROM "
            f"media_info WHERE public_id IN :public_ids"
        ).bindparams(bindparam("public_ids", expanding=True))
        rows = await session.execute(sql, {"public_ids": public_ids})
        rows = rows.fetchall()
        image_urls = await Image.get_internal_image_urls_by_ids_async(
            session=session, image_ids=[image_id for _, image_id in rows]
        )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result={
                str(public_id): image_urls.get(image_id)
                for public_id, image_id in rows
            },
        )
