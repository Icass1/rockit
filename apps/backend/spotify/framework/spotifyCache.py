from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

from backend.spotify.access.db.ormModels.albumCache import CacheAlbumRow
from backend.spotify.access.db.ormModels.artistCache import CacheArtistRow
from backend.spotify.access.db.ormModels.playlistCache import CachePlaylistRow
from backend.spotify.access.db.ormModels.trackCache import CacheTrackRow
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.spotify.access.spotifyCacheAccess import SpotifyCacheAccess
from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist

logger = getLogger(__name__)


class SpotifyCache:
    @staticmethod
    async def add_album_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyCacheAccess.add_album_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_albums_async(
        session: AsyncSession, ids: List[str]
    ) -> AResult[List[RawSpotifyApiAlbum]]:
        a_result: AResult[List[CacheAlbumRow]] = (
            await SpotifyCacheAccess.get_albums_by_ids_async(session=session, ids=ids)
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows: List[CacheAlbumRow] = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[RawSpotifyApiAlbum.from_dict(r.json) for r in rows],
        )

    @staticmethod
    async def add_track_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyCacheAccess.add_track_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_tracks_async(
        session: AsyncSession, ids: List[str]
    ) -> AResult[List[RawSpotifyApiTrack]]:
        a_result: AResult[List[CacheTrackRow]] = (
            await SpotifyCacheAccess.get_tracks_by_ids_async(session=session, ids=ids)
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows: List[CacheTrackRow] = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[RawSpotifyApiTrack.from_dict(r.json) for r in rows],
        )

    @staticmethod
    async def add_artist_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyCacheAccess.add_artist_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_artists_async(
        session: AsyncSession, ids: List[str]
    ) -> AResult[List[RawSpotifyApiArtist]]:
        a_result: AResult[List[CacheArtistRow]] = (
            await SpotifyCacheAccess.get_artists_by_ids_async(session=session, ids=ids)
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows: List[CacheArtistRow] = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[RawSpotifyApiArtist.from_dict(r.json) for r in rows],
        )

    @staticmethod
    async def add_playlist_async(
        session: AsyncSession, id: str, json: Dict[str, Any]
    ) -> AResultCode:
        return await SpotifyCacheAccess.add_playlist_async(
            session=session, id=id, json=json
        )

    @staticmethod
    async def get_playlist_async(
        session: AsyncSession, id: str
    ) -> AResult[RawSpotifyApiPlaylist]:
        a_result: AResult[CachePlaylistRow] = (
            await SpotifyCacheAccess.get_playlist_async(session=session, id=id)
        )
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        row: CachePlaylistRow = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=RawSpotifyApiPlaylist.from_dict(row.json),
        )
