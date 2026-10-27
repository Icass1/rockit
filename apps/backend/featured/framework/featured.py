from datetime import UTC, datetime
from logging import Logger

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.access.mediaAccess import MediaAccess
from core.access.statsAccess import StatsAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers as provider_utils
from core.framework.core import Core
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.types.playlistMediaTypes import PlaylistResponseItem
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


async def _resolve_medias(
    session: AsyncSession,
    public_ids: list[str],
) -> Result[
    list[PlaylistResponseItem[BaseSongWithAlbumResponse] | PlaylistResponseItem[BaseVideoResponse]]
]:
    """Resolve a list of song and video public_ids into PlaylistResponseItems."""

    if not public_ids:
        return Result(code=ResultCode.OK, message="OK", result=[])

    a_result_medias: Result[
        list[CoreMediaRow]
    ] = await MediaAccess.get_medias_from_public_ids_async(
        session=session,
        public_ids=public_ids,
        media_type_keys=[MediaTypeEnum.SONG, MediaTypeEnum.VIDEO],
    )
    if a_result_medias.is_not_ok():
        logger.error(f"Error getting medias. {a_result_medias.info()}")
        return Result(code=a_result_medias.code(), message=a_result_medias.message())

    rows: list[CoreMediaRow] = a_result_medias.result()

    song_rows: list[CoreMediaRow] = []
    video_rows: list[CoreMediaRow] = []
    for row in rows:
        if row.media_type_key == MediaTypeEnum.SONG.value:
            song_rows.append(row)
        elif row.media_type_key == MediaTypeEnum.VIDEO.value:
            video_rows.append(row)

    song_groups: dict[int, list[str]] = {}
    for row in song_rows:
        song_groups.setdefault(row.provider_id, []).append(row.public_id)

    video_groups: dict[int, list[str]] = {}
    for row in video_rows:
        video_groups.setdefault(row.provider_id, []).append(row.public_id)

    song_result_map: dict[str, BaseSongWithAlbumResponse] = {}
    for provider_id, ids in song_groups.items():
        provider: BaseMediaProvider | None = provider_utils.find_media_provider(provider_id)
        if provider is None:
            logger.error(f"Provider not found for provider_id {provider_id}")
            continue

        a_result_songs: Result[list[BaseSongWithAlbumResponse]] = await provider.get_songs_async(
            session=session, public_ids=ids
        )
        if a_result_songs.is_not_ok():
            logger.error(f"Error getting songs from provider. {a_result_songs.info()}")
            continue

        for song in a_result_songs.result():
            song_result_map[song.publicId] = song

    video_result_map: dict[str, BaseVideoResponse] = {}
    for provider_id, ids in video_groups.items():
        provider = provider_utils.find_media_provider(provider_id)
        if provider is None:
            logger.error(f"Provider not found for provider_id {provider_id}")
            continue

        a_result_videos: Result[list[BaseVideoResponse]] = await provider.get_videos_async(
            session=session, public_ids=ids
        )
        if a_result_videos.is_not_ok():
            logger.error(f"Error getting videos from provider. {a_result_videos.info()}")
            continue

        for video in a_result_videos.result():
            video_result_map[video.publicId] = video

    now = datetime.now(UTC)
    items: list[
        PlaylistResponseItem[BaseSongWithAlbumResponse] | PlaylistResponseItem[BaseVideoResponse]
    ] = []
    for pid in public_ids:
        song = song_result_map.get(pid)
        if song:
            items.append(
                PlaylistResponseItem[BaseSongWithAlbumResponse](
                    item=song,
                    addedAt=now,
                    expanded=False,
                )
            )
            continue
        video = video_result_map.get(pid)
        if video:
            items.append(
                PlaylistResponseItem[BaseVideoResponse](
                    item=video,
                    addedAt=now,
                    expanded=False,
                )
            )

    return Result(code=ResultCode.OK, message="OK", result=items)


async def get_liked_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> Result[BasePlaylistWithMediasResponse]:
    from core.framework.user.user import User

    a_result_ids: Result[list[str]] = await User.get_user_liked_media_public_ids(
        session=session, user_id=user_id
    )
    if a_result_ids.is_not_ok():
        logger.error(f"Error getting liked media. {a_result_ids.info()}")
        return Result(code=a_result_ids.code(), message=a_result_ids.message())

    public_ids: list[str] = a_result_ids.result()

    a_result_items: Result[
        list[
            PlaylistResponseItem[BaseSongWithAlbumResponse]
            | PlaylistResponseItem[BaseVideoResponse]
        ]
    ] = await _resolve_medias(session=session, public_ids=public_ids)
    if a_result_items.is_not_ok():
        return Result(code=a_result_items.code(), message=a_result_items.message())

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            description=None,
            provider=Core.provider_name,
            publicId="liked",
            url="/playlist/liked",
            providerUrl="",
            name="Liked Songs",
            contributors=[],
            imageUrl="/rockit-background.png",
            owner=BaseArtistResponse(
                provider=Core.provider_name,
                publicId="rockit",
                url="",
                providerUrl="",
                name="Rock It!",
                imageUrl="",
                dominantColor="",
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_most_listened_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> Result[BasePlaylistWithMediasResponse]:
    from datetime import timedelta

    end_date = datetime.now(UTC)
    start_date = end_date - timedelta(days=365 * 10)

    a_result_ids: Result[list[str]] = await StatsAccess.get_top_media_public_ids_async(
        session=session,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=50,
    )
    if a_result_ids.is_not_ok():
        logger.error(f"Error getting top media. {a_result_ids.info()}")
        return Result(code=a_result_ids.code(), message=a_result_ids.message())

    public_ids: list[str] = a_result_ids.result()

    a_result_items: Result[
        list[
            PlaylistResponseItem[BaseSongWithAlbumResponse]
            | PlaylistResponseItem[BaseVideoResponse]
        ]
    ] = await _resolve_medias(session=session, public_ids=public_ids)
    if a_result_items.is_not_ok():
        return Result(code=a_result_items.code(), message=a_result_items.message())

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            type="playlist",
            description=None,
            provider=Core.provider_name,
            publicId="most-listened",
            url="/playlist/most-listened",
            providerUrl="",
            name="Most Listened",
            contributors=[],
            imageUrl="/rockit-background.png",
            owner=BaseArtistResponse(
                provider=Core.provider_name,
                publicId="rockit",
                url="",
                providerUrl="",
                name="Rock It!",
                imageUrl="",
                dominantColor="",
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_recent_mix_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> Result[BasePlaylistWithMediasResponse]:
    from datetime import timedelta

    end_date = datetime.now(UTC)
    start_date = end_date - timedelta(days=14)

    a_result_ids: Result[list[str]] = await StatsAccess.get_top_media_public_ids_async(
        session=session,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=50,
    )
    if a_result_ids.is_not_ok():
        logger.error(f"Error getting recent media. {a_result_ids.info()}")
        return Result(code=a_result_ids.code(), message=a_result_ids.message())

    public_ids: list[str] = a_result_ids.result()

    a_result_items: Result[
        list[
            PlaylistResponseItem[BaseSongWithAlbumResponse]
            | PlaylistResponseItem[BaseVideoResponse]
        ]
    ] = await _resolve_medias(session=session, public_ids=public_ids)
    if a_result_items.is_not_ok():
        return Result(code=a_result_items.code(), message=a_result_items.message())

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            type="playlist",
            description=None,
            provider=Core.provider_name,
            publicId="recent-mix",
            url="/playlist/recent-mix",
            providerUrl="",
            name="Recent Mix",
            contributors=[],
            imageUrl="/rockit-background.png",
            owner=BaseArtistResponse(
                provider=Core.provider_name,
                publicId="rockit",
                url="",
                providerUrl="",
                name="Rock It!",
                imageUrl="",
                dominantColor="",
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_last_month_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> Result[BasePlaylistWithMediasResponse]:
    from datetime import timedelta

    end_date = datetime.now(UTC)
    start_date = end_date - timedelta(days=30)

    a_result_ids: Result[list[str]] = await StatsAccess.get_top_media_public_ids_async(
        session=session,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=50,
    )
    if a_result_ids.is_not_ok():
        logger.error(f"Error getting top media. {a_result_ids.info()}")
        return Result(code=a_result_ids.code(), message=a_result_ids.message())

    public_ids: list[str] = a_result_ids.result()

    a_result_items: Result[
        list[
            PlaylistResponseItem[BaseSongWithAlbumResponse]
            | PlaylistResponseItem[BaseVideoResponse]
        ]
    ] = await _resolve_medias(session=session, public_ids=public_ids)
    if a_result_items.is_not_ok():
        return Result(code=a_result_items.code(), message=a_result_items.message())

    last_month_date = end_date - timedelta(days=30)
    last_month_name = last_month_date.strftime("%B").lower()

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            type="playlist",
            description=None,
            provider=Core.provider_name,
            publicId="last-month",
            url="/playlist/last-month",
            providerUrl="",
            name=f"{last_month_date.strftime('%B')} Recap",
            contributors=[],
            imageUrl=f"/recap-covers/{last_month_name}.png",
            owner=BaseArtistResponse(
                provider=Core.provider_name,
                publicId="rockit",
                url="",
                providerUrl="",
                name="Rock It!",
                imageUrl="",
                dominantColor="",
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_year_recap_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> Result[BasePlaylistWithMediasResponse]:

    now = datetime.now(UTC)
    last_year = now.year - 1
    start_date = datetime(year=last_year, month=1, day=1, tzinfo=UTC)
    end_date = datetime(year=last_year + 1, month=1, day=1, tzinfo=UTC)

    a_result_ids: Result[list[str]] = await StatsAccess.get_top_media_public_ids_async(
        session=session,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        limit=0,
    )
    if a_result_ids.is_not_ok():
        logger.error(f"Error getting top media. {a_result_ids.info()}")
        return Result(code=a_result_ids.code(), message=a_result_ids.message())

    public_ids: list[str] = a_result_ids.result()

    a_result_items: Result[
        list[
            PlaylistResponseItem[BaseSongWithAlbumResponse]
            | PlaylistResponseItem[BaseVideoResponse]
        ]
    ] = await _resolve_medias(session=session, public_ids=public_ids)
    if a_result_items.is_not_ok():
        return Result(code=a_result_items.code(), message=a_result_items.message())

    return Result(
        code=ResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            type="playlist",
            description=None,
            provider=Core.provider_name,
            publicId="year-recap",
            url="/playlist/year-recap",
            providerUrl="",
            name=f"{last_year} Recap",
            contributors=[],
            imageUrl="/rockit-background.png",
            owner=BaseArtistResponse(
                provider=Core.provider_name,
                publicId="rockit",
                url="",
                providerUrl="",
                name="Rock It!",
                imageUrl="",
                dominantColor="",
            ),
            medias=a_result_items.result(),
        ),
    )
