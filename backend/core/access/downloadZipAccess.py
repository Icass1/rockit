import os
from logging import Logger
from typing import List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import MEDIA_PATH
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
    ) -> AResult[List[Tuple[str, str]]]:
        """Return downloaded local files for the requested core media IDs."""

        if not public_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        result = await session.execute(
            select(CoreMediaRow.id).where(CoreMediaRow.public_id.in_(public_ids))
        )
        media_ids: List[int] = [media_id for (media_id,) in result.all()]
        if not media_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        paths: List[Tuple[str, str]] = []
        models_and_columns = [
            (SpotifyTrackRow, SpotifyTrackRow.name, SpotifyTrackRow.path),
            (
                SpotifyScrapperTrackRow,
                SpotifyScrapperTrackRow.name,
                SpotifyScrapperTrackRow.path,
            ),
            (
                YoutubeMusicTrackRow,
                YoutubeMusicTrackRow.title,
                YoutubeMusicTrackRow.path,
            ),
            (
                YoutubeVideoRow,
                YoutubeVideoRow.name,
                YoutubeVideoRow.video_path,
            ),
            (RockitSongRow, RockitSongRow.name, RockitSongRow.file_path),
            (RockitVideoRow, RockitVideoRow.name, RockitVideoRow.file_path),
        ]
        for model, name_column, path_column in models_and_columns:
            rows = await session.execute(
                select(name_column, path_column).where(
                    model.id.in_(media_ids), path_column.isnot(None)
                )
            )
            for name, path in rows.all():
                full_path = (
                    path if os.path.isabs(path) else os.path.join(MEDIA_PATH, path)
                )
                if not os.path.isfile(full_path):
                    logger.warning(
                        f"Media '{name}' is marked as downloaded but its file "
                        f"is missing. {full_path}"
                    )
                    continue

                paths.append((name, full_path))

        return AResult(code=AResultCode.OK, message="OK", result=paths)
