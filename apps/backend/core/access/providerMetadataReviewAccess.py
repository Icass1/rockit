from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.models.metadataReviewTables import MetadataReviewTables
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class ProviderMetadataReviewAccess:
    @staticmethod
    @safe_async
    async def apply_async(
        session: AsyncSession, public_id: str, changes: dict[str, str], tables: MetadataReviewTables
    ) -> Result[bool]:
        media = await session.scalar(
            select(CoreMediaRow).where(CoreMediaRow.public_id == public_id)
        )
        table = tables.media.get(media.media_type_key) if media else None
        if media is None or table is None:
            logger.warning("Unsupported reviewed media type")
            return Result(code=ResultCode.BAD_REQUEST, message="Unsupported reviewed media type")
        row = await session.scalar(
            select(table.c.id).where(table.c.id == media.id).with_for_update()
        )
        if row is None:
            logger.warning("Reviewed provider record unavailable")
            return Result(code=ResultCode.NOT_FOUND, message="Provider record not found")
        allowed = {"title"}
        if media.media_type_key in tables.artist_links:
            allowed.add("artist")
        if media.media_type_key == MediaTypeEnum.SONG.value:
            allowed.add("album")
        if media.media_type_key == MediaTypeEnum.ALBUM.value:
            allowed.add("releaseDate")
        if set(changes) - allowed:
            logger.warning("Metadata fields do not match provider media")
            return Result(
                code=ResultCode.BAD_REQUEST, message="Unsupported metadata fields for media"
            )
        artist_ids: list[int] = []
        if "artist" in changes:
            names = list(
                dict.fromkeys(part.strip() for part in changes["artist"].split(",") if part.strip())
            )
            for name in names:
                ids = list(
                    await session.scalars(
                        select(tables.artist.c.id).where(tables.artist.c.name == name)
                    )
                )
                if len(ids) != 1:
                    logger.warning("Reviewed artist must resolve to one existing provider artist")
                    return Result(
                        code=ResultCode.BAD_REQUEST,
                        message="Artist is missing or ambiguous; import the correct artist first",
                    )
                artist_ids.append(int(ids[0]))
            if not artist_ids:
                logger.warning("Reviewed artist list is empty")
                return Result(code=ResultCode.BAD_REQUEST, message="Artist list is empty")
        album_id: int | None = None
        if "album" in changes:
            ids = list(
                await session.scalars(
                    select(tables.album.c.id).where(
                        tables.album.c[tables.album_title] == changes["album"]
                    )
                )
            )
            if len(ids) != 1:
                logger.warning("Reviewed album must resolve to one existing provider album")
                return Result(
                    code=ResultCode.BAD_REQUEST,
                    message="Album is missing or ambiguous; import the correct album first",
                )
            album_id = int(ids[0])
        values: dict[str, str | int] = {}
        if "title" in changes:
            values[tables.title_columns[media.media_type_key]] = changes["title"]
        if "releaseDate" in changes:
            values["release_date"] = changes["releaseDate"]
        if album_id is not None:
            values["album_id"] = album_id
        if values:
            await session.execute(update(table).where(table.c.id == media.id).values(**values))
        if "artist" in changes:
            link, target = tables.artist_links[media.media_type_key]
            await session.execute(delete(link).where(link.c[target] == media.id))
            await session.execute(
                insert(link),
                [{target: media.id, "artist_id": artist_id} for artist_id in artist_ids],
            )
        await session.flush()
        return Result[bool].ok(True)
