from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotifyScrapper.access.spotifyScrapperCacheAccess import (
    SpotifyScrapperCacheAccess,
)
from backend.spotifyScrapper.framework.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedTrack,
    ScrappedArtist,
    ScrappedPlaylist,
    parse_album,
    parse_artist,
    parse_track,
    parse_playlist,
)

logger = getLogger(__name__)


class SpotifyScrapperCache:

    @staticmethod
    async def add_album_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyScrapperCacheAccess.add_album_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_albums_async(
        session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedAlbum]]:
        a_result = await SpotifyScrapperCacheAccess.get_albums_by_ids_async(
            session=session, ids=ids
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        albums: List[ScrappedAlbum] = [
            parse_album(row.json) for row in a_result.result()
        ]
        return AResult(code=AResultCode.OK, message="OK", result=albums)

    @staticmethod
    async def add_track_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyScrapperCacheAccess.add_track_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_tracks_async(
        session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedTrack]]:
        a_result = await SpotifyScrapperCacheAccess.get_tracks_by_ids_async(
            session=session, ids=ids
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        tracks: List[ScrappedTrack] = [
            parse_track(row.json) for row in a_result.result()
        ]
        return AResult(code=AResultCode.OK, message="OK", result=tracks)

    @staticmethod
    async def add_artist_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyScrapperCacheAccess.add_artist_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_artists_async(
        session: AsyncSession, ids: List[str]
    ) -> AResult[List[ScrappedArtist]]:
        a_result = await SpotifyScrapperCacheAccess.get_artists_by_ids_async(
            session=session, ids=ids
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        artists: List[ScrappedArtist] = [
            parse_artist(row.json) for row in a_result.result()
        ]
        return AResult(code=AResultCode.OK, message="OK", result=artists)

    @staticmethod
    async def add_playlist_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyScrapperCacheAccess.add_playlist_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_playlist_async(
        session: AsyncSession, id: str
    ) -> AResult[ScrappedPlaylist]:
        a_result = await SpotifyScrapperCacheAccess.get_playlist_async(
            session=session, id=id
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=parse_playlist(a_result.result().json),
        )
