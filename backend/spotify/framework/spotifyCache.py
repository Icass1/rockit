from typing import Any, Dict, List

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
    async def add_album_async(id: str, json: Dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_album_async(id, json)

    @staticmethod
    async def get_albums_async(ids: List[str]) -> AResult[List[RawSpotifyApiAlbum]]:
        a_result = await SpotifyCacheAccess.get_albums_by_ids_async(ids)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows = a_result.result()
        return AResult(code=AResultCode.OK, message="OK",
                       result=[RawSpotifyApiAlbum.from_dict(r.json) for r in rows])

    @staticmethod
    async def add_track_async(id: str, json: Dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_track_async(id, json)

    @staticmethod
    async def get_tracks_async(ids: List[str]) -> AResult[List[RawSpotifyApiTrack]]:
        a_result = await SpotifyCacheAccess.get_tracks_by_ids_async(ids)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows = a_result.result()
        return AResult(code=AResultCode.OK, message="OK",
                       result=[RawSpotifyApiTrack.from_dict(r.json) for r in rows])

    @staticmethod
    async def add_artist_async(id: str, json: Dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_artist_async(id, json)

    @staticmethod
    async def get_artists_async(ids: List[str]) -> AResult[List[RawSpotifyApiArtist]]:
        a_result = await SpotifyCacheAccess.get_artists_by_ids_async(ids)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        rows = a_result.result()
        return AResult(code=AResultCode.OK, message="OK",
                       result=[RawSpotifyApiArtist.from_dict(r.json) for r in rows])

    @staticmethod
    async def add_playlist_async(id: str, json: Dict[str, Any]) -> AResultCode:
        return await SpotifyCacheAccess.add_playlist_async(id, json)

    @staticmethod
    async def get_playlist_async(id: str) -> AResult[RawSpotifyApiPlaylist]:
        a_result = await SpotifyCacheAccess.get_playlist_async(id)
        if a_result.is_not_ok():
            return AResult(code=a_result.code(), message=a_result.message())
        row = a_result.result()
        return AResult(code=AResultCode.OK, message="OK",
                       result=RawSpotifyApiPlaylist.from_dict(row.json))
