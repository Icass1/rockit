from sqlalchemy import text, bindparam
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.access.statsAccess import get_media_info_cte
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async


class MediaSummaryAccess:
    @staticmethod
    @safe_async
    async def images_async(
        session: AsyncSession, public_ids: list[str]
    ) -> AResult[dict[str, str | None]]:
        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})
        sql = text(
            f"WITH {get_media_info_cte()} SELECT public_id, image_url FROM media_info WHERE public_id IN :public_ids"
        ).bindparams(bindparam("public_ids", expanding=True))
        rows = await session.execute(sql, {"public_ids": public_ids})
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={str(public_id): image_url for public_id, image_url in rows},
        )
