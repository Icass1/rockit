from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.aResult import AResult, AResultCode
from logger import getLogger
from spotify.access.db.ormModels.albumCache import CacheAlbumRow
from spotify.access.db.ormModels.artistCache import CacheArtistRow
from spotify.access.db.ormModels.playlistCache import CachePlaylistRow
from spotify.access.db.ormModels.trackCache import CacheTrackRow
from spotify.access.spotifyCacheAccess import SpotifyCacheAccess
from spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist
from spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack

logger = getLogger(__name__)


class SpotifyCache:
    @staticmethod
    async def add_album_async(session: AsyncSession, id: str, json: dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_album_async(session=session, id=id, json=json)

    @staticmethod
    async def get_albums_async(
        session: AsyncSession, ids: list[str]
    ) -> AResult[list[RawSpotifyApiAlbum]]:
        a_result: AResult[list[CacheAlbumRow]] = await SpotifyCacheAccess.get_albums_by_ids_async(
            session=session, ids=ids
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows: list[CacheAlbumRow] = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[RawSpotifyApiAlbum.from_dict(r.json) for r in rows],
        )

    @staticmethod
    async def add_track_async(session: AsyncSession, id: str, json: dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_track_async(session=session, id=id, json=json)

    @staticmethod
    async def get_tracks_async(
        session: AsyncSession, ids: list[str]
    ) -> AResult[list[RawSpotifyApiTrack]]:
        a_result: AResult[list[CacheTrackRow]] = await SpotifyCacheAccess.get_tracks_by_ids_async(
            session=session, ids=ids
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows: list[CacheTrackRow] = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[RawSpotifyApiTrack.from_dict(r.json) for r in rows],
        )

    @staticmethod
    async def add_artist_async(session: AsyncSession, id: str, json: dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_artist_async(session=session, id=id, json=json)

    @staticmethod
    async def get_artists_async(
        session: AsyncSession, ids: list[str]
    ) -> AResult[list[RawSpotifyApiArtist]]:
        a_result: AResult[list[CacheArtistRow]] = await SpotifyCacheAccess.get_artists_by_ids_async(
            session=session, ids=ids
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows: list[CacheArtistRow] = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[RawSpotifyApiArtist.from_dict(r.json) for r in rows],
        )

    @staticmethod
    async def add_playlist_async(
        session: AsyncSession, id: str, json: dict[str, Any]
    ) -> AResultCode:
        return await SpotifyCacheAccess.add_playlist_async(session=session, id=id, json=json)

    @staticmethod
    async def get_playlist_async(session: AsyncSession, id: str) -> AResult[RawSpotifyApiPlaylist]:
        a_result: AResult[CachePlaylistRow] = await SpotifyCacheAccess.get_playlist_async(
            session=session, id=id
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        row: CachePlaylistRow = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RawSpotifyApiPlaylist.from_dict(row.json),
        )
