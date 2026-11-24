from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.access.db.ormModels.media import CoreMediaRow
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode
from rockit.access.db.ormModels.album import RockitAlbumRow
from rockit.access.db.ormModels.artist import RockitArtistRow
from rockit.access.db.ormModels.song import RockitSongRow
from rockit.access.db.ormModels.video import RockitVideoRow
from rockit.access.rockitAccess import RockitAccess

logger = getLogger(__name__)


class MetadataReviewAccess:
    @staticmethod
    @safe_async
    async def apply_async(
        session: AsyncSession, public_id: str, changes: dict[str, str]
    ) -> Result[bool]:
        media = await session.scalar(
            select(CoreMediaRow).where(CoreMediaRow.public_id == public_id)
        )
        if media is None:
            logger.warning("Reviewed media no longer exists")
            return Result(code=ResultCode.NOT_FOUND, message="Media not found")
        model = {
            MediaTypeEnum.SONG.value: RockitSongRow,
            MediaTypeEnum.ALBUM.value: RockitAlbumRow,
            MediaTypeEnum.VIDEO.value: RockitVideoRow,
        }.get(media.media_type_key)
        if model is None:
            logger.warning("Unsupported metadata media type")
            return Result(code=ResultCode.BAD_REQUEST, message="Unsupported metadata media type")
        row = await session.scalar(
            select(model)
            .where(model.id == media.id)
            .options(selectinload(model.artists))
            .with_for_update()
        )
        if row is None:
            logger.warning("Reviewed provider media unavailable")
            return Result(code=ResultCode.NOT_FOUND, message="Media not found")
        if ("album" in changes and not isinstance(row, RockitSongRow)) or (
            "releaseDate" in changes and not isinstance(row, RockitAlbumRow)
        ):
            logger.warning("Metadata fields do not match the media type")
            return Result(
                code=ResultCode.BAD_REQUEST, message="Metadata fields do not match the media type"
            )
        # Resolve relationships first. Never rename a shared artist or album.
        artists: list[RockitArtistRow] = []
        if "artist" in changes:
            for name in dict.fromkeys(
                part.strip() for part in changes["artist"].split(",") if part.strip()
            ):
                found = await RockitAccess.get_or_create_artist_async(
                    session=session, name=name, image_id=row.image_id
                )
                if found.is_not_ok():
                    logger.error("Cannot resolve reviewed artist: %s", found.info())
                    return Result[bool].from_result(found)
                artists.append(found.result())
        album = None
        if "album" in changes:
            candidates = list(
                await session.scalars(
                    select(RockitAlbumRow)
                    .where(RockitAlbumRow.name == changes["album"])
                    .options(selectinload(RockitAlbumRow.artists))
                )
            )
            names = {artist.name for artist in (artists if "artist" in changes else row.artists)}
            candidates = [
                candidate
                for candidate in candidates
                if {artist.name for artist in candidate.artists} == names
            ]
            if len(candidates) > 1:
                logger.warning("Reviewed album name is ambiguous")
                return Result(code=ResultCode.BAD_REQUEST, message="Album is ambiguous")
            if candidates:
                album = candidates[0]
            else:
                created = await RockitAccess.create_album_async(
                    session=session,
                    name=changes["album"],
                    artist_names=sorted(names),
                    provider_id=media.provider_id,
                    image_id=row.image_id,
                    release_date="",
                )
                if created.is_not_ok():
                    logger.error("Cannot create reviewed album: %s", created.info())
                    return Result[bool].from_result(created)
                album = created.result()
        if "title" in changes:
            row.name = changes["title"]
        if "artist" in changes:
            row.artists = artists
        if isinstance(row, RockitSongRow) and album is not None:
            row.album_id = album.id
        if isinstance(row, RockitAlbumRow) and "releaseDate" in changes:
            row.release_date = changes["releaseDate"]
        await session.flush()
        return Result[bool].ok(True)
