from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from logging import Logger
from typing import List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.rockit.access.db.ormModels.song import RockitSongRow
from backend.rockit.access.db.ormModels.video import RockitVideoRow
from backend.spotify.access.db.ormModels.track import TrackRow as SpotifyTrackRow
from backend.spotifyScrapper.access.db.ormModels.track import (
    TrackRow as SpotifyScrapperTrackRow,
)
from backend.youtube.access.db.ormModels.video import VideoRow as YoutubeVideoRow
from backend.youtubeMusic.access.db.ormModels.track import (
    TrackRow as YoutubeMusicTrackRow,
)

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

logger: Logger = getLogger(name=__name__)


class DownloadZipAccess:
    @staticmethod
    @safe_async
    async def get_container_public_ids_async(
        session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[str]]:
        """Return the subset of public IDs that are albums or playlists."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        result = await session.execute(
            select(CoreMediaRow.public_id).where(
                CoreMediaRow.public_id.in_(public_ids),
                CoreMediaRow.media_type_key.in_(
                    [MediaTypeEnum.ALBUM.value, MediaTypeEnum.PLAYLIST.value]
                ),
            )
        )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[public_id for (public_id,) in result.all()],
        )

    @staticmethod
    @safe_async
    async def get_file_paths_async(
        session: AsyncSession, public_ids: List[str]
    ) -> AResult[List[Tuple[str, StorageObjectRow]]]:
        """Return downloaded local files for the requested core media IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        result = await session.execute(
            select(CoreMediaRow.id).where(CoreMediaRow.public_id.in_(public_ids))
        )
        media_ids: List[int] = [media_id for (media_id,) in result.all()]
        if not media_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        files: List[Tuple[str, StorageObjectRow]] = []
        for model, name_column in [
            (SpotifyTrackRow, SpotifyTrackRow.name),
            (SpotifyScrapperTrackRow, SpotifyScrapperTrackRow.name),
            (YoutubeMusicTrackRow, YoutubeMusicTrackRow.title),
            (YoutubeVideoRow, YoutubeVideoRow.name),
            (RockitSongRow, RockitSongRow.name),
            (RockitVideoRow, RockitVideoRow.name),
        ]:
            rows = await session.execute(
                select(name_column, StorageObjectRow)
                .join(StorageObjectRow, model.storage_object_id == StorageObjectRow.id)
                .where(model.id.in_(media_ids))
            )
            files.extend((name, obj) for name, obj in rows.all())
        return AResult(code=AResultCode.OK, message="OK", result=files)
