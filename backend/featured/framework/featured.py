from datetime import datetime, timezone
from logging import Logger
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.statsAccess import StatsAccess
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.framework import providers as provider_utils
from backend.core.framework.core import Core
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.core.types.playlistMediaTypes import PlaylistResponseItem

logger: Logger = getLogger(__name__)


async def _resolve_songs(
    session: AsyncSession,
    public_ids: List[str],
) -> AResult[List[PlaylistResponseItem[BaseSongWithAlbumResponse]]]:
    """Resolve a list of song public_ids into PlaylistResponseItems."""

    if not public_ids:
        return AResult(code=AResultCode.OK, message="OK", result=[])

    a_result_medias: AResult[List[CoreMediaRow]] = (
        await MediaAccess.get_medias_from_public_ids_async(
            session=session,
            public_ids=public_ids,
            media_type_keys=[MediaTypeEnum.SONG],
        )
    )
    if a_result_medias.is_not_ok():
        logger.error(f"Error getting medias. {a_result_medias.info()}")
        return AResult(code=a_result_medias.code(), message=a_result_medias.message())

    rows: List[CoreMediaRow] = a_result_medias.result()

    groups: dict[int, List[str]] = {}
    for row in rows:
        groups.setdefault(row.provider_id, []).append(row.public_id)

    result_map: dict[str, BaseSongWithAlbumResponse] = {}
    for provider_id, ids in groups.items():
        provider: BaseMediaProvider | None = provider_utils.find_media_provider(
            provider_id
        )
        if provider is None:
            logger.error(f"Provider not found for provider_id {provider_id}")
            continue

        a_result_songs: AResult[List[BaseSongWithAlbumResponse]] = (
            await provider.get_songs_async(session=session, public_ids=ids)
        )
        if a_result_songs.is_not_ok():
            logger.error(f"Error getting songs from provider. {a_result_songs.info()}")
            continue

        for song in a_result_songs.result():
            result_map[song.publicId] = song

    now = datetime.now(timezone.utc)
    items: List[PlaylistResponseItem[BaseSongWithAlbumResponse]] = []
    for pid in public_ids:
        song = result_map.get(pid)
        if song:
            items.append(
                PlaylistResponseItem(
                    item=song,
                    addedAt=now,
                    expanded=False,
                )
            )

    return AResult(code=AResultCode.OK, message="OK", result=items)


async def get_liked_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> AResult[BasePlaylistWithMediasResponse]:
    from backend.core.framework.user.user import User

    a_result_ids: AResult[List[str]] = await User.get_user_liked_media_public_ids(
        session=session, user_id=user_id
    )
    if a_result_ids.is_not_ok():
        logger.error(f"Error getting liked media. {a_result_ids.info()}")
        return AResult(code=a_result_ids.code(), message=a_result_ids.message())

    public_ids: List[str] = a_result_ids.result()

    a_result_items: AResult[List[PlaylistResponseItem[BaseSongWithAlbumResponse]]] = (
        await _resolve_songs(session=session, public_ids=public_ids)
    )
    if a_result_items.is_not_ok():
        return AResult(code=a_result_items.code(), message=a_result_items.message())

    return AResult(
        code=AResultCode.OK,
        message="OK",
        result=BasePlaylistWithMediasResponse(
            type="playlist",
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
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_most_listened_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> AResult[BasePlaylistWithMediasResponse]:
    from datetime import timedelta

    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=365 * 10)

    a_result_top: AResult[list[StatsRankedItemResponse]] = (
        await StatsAccess.get_top_songs_async(
            session=session,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=50,
        )
    )
    if a_result_top.is_not_ok():
        logger.error(f"Error getting top songs. {a_result_top.info()}")
        return AResult(code=a_result_top.code(), message=a_result_top.message())

    public_ids: List[str] = [item.publicId for item in a_result_top.result()]

    a_result_items: AResult[List[PlaylistResponseItem[BaseSongWithAlbumResponse]]] = (
        await _resolve_songs(session=session, public_ids=public_ids)
    )
    if a_result_items.is_not_ok():
        return AResult(code=a_result_items.code(), message=a_result_items.message())

    return AResult(
        code=AResultCode.OK,
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
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_recent_mix_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> AResult[BasePlaylistWithMediasResponse]:
    a_result_recent: AResult[List[str]] = (
        await StatsAccess.get_recently_played_songs_async(
            session=session, user_id=user_id, limit=50
        )
    )
    if a_result_recent.is_not_ok():
        logger.error(f"Error getting recent songs. {a_result_recent.info()}")
        return AResult(code=a_result_recent.code(), message=a_result_recent.message())

    public_ids: List[str] = a_result_recent.result()

    a_result_items: AResult[List[PlaylistResponseItem[BaseSongWithAlbumResponse]]] = (
        await _resolve_songs(session=session, public_ids=public_ids)
    )
    if a_result_items.is_not_ok():
        return AResult(code=a_result_items.code(), message=a_result_items.message())

    return AResult(
        code=AResultCode.OK,
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
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_last_month_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> AResult[BasePlaylistWithMediasResponse]:
    from datetime import timedelta

    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)

    a_result_top: AResult[list[StatsRankedItemResponse]] = (
        await StatsAccess.get_top_songs_async(
            session=session,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=50,
        )
    )
    if a_result_top.is_not_ok():
        logger.error(f"Error getting top songs. {a_result_top.info()}")
        return AResult(code=a_result_top.code(), message=a_result_top.message())

    public_ids: List[str] = [item.publicId for item in a_result_top.result()]

    a_result_items: AResult[List[PlaylistResponseItem[BaseSongWithAlbumResponse]]] = (
        await _resolve_songs(session=session, public_ids=public_ids)
    )
    if a_result_items.is_not_ok():
        return AResult(code=a_result_items.code(), message=a_result_items.message())

    last_month_date = end_date - timedelta(days=30)
    last_month_name = last_month_date.strftime("%B").lower()

    return AResult(
        code=AResultCode.OK,
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
            ),
            medias=a_result_items.result(),
        ),
    )


async def get_year_recap_playlist_async(
    session: AsyncSession,
    user_id: int,
) -> AResult[BasePlaylistWithMediasResponse]:

    now = datetime.now(timezone.utc)
    last_year = now.year - 1
    start_date = datetime(year=last_year, month=1, day=1, tzinfo=timezone.utc)
    end_date = datetime(year=last_year + 1, month=1, day=1, tzinfo=timezone.utc)

    a_result_top: AResult[list[StatsRankedItemResponse]] = (
        await StatsAccess.get_top_songs_async(
            session=session,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=100,
        )
    )
    if a_result_top.is_not_ok():
        logger.error(f"Error getting top songs. {a_result_top.info()}")
        return AResult(code=a_result_top.code(), message=a_result_top.message())

    public_ids: List[str] = [item.publicId for item in a_result_top.result()]

    a_result_items: AResult[List[PlaylistResponseItem[BaseSongWithAlbumResponse]]] = (
        await _resolve_songs(session=session, public_ids=public_ids)
    )
    if a_result_items.is_not_ok():
        return AResult(code=a_result_items.code(), message=a_result_items.message())

    return AResult(
        code=AResultCode.OK,
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
            ),
            medias=a_result_items.result(),
        ),
    )
