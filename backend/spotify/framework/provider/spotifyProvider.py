from logging import Logger
from typing import List

from backend.spotify.responses.albumResponse import AlbumResponse
from backend.spotify.responses.songResponse import SongResponse
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.searchResponse import BaseSearchItem
from backend.core.responses.baseSongResponse import BaseSongResponse
from backend.core.responses.baseAlbumResponse import BaseAlbumResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.core.access.enumAccess import EnumAccess

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.spotify.framework.spotify import Spotify
from backend.spotify.framework.download.spotifyDownload import SpotifyDownload

from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow
from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.db.ormModels.track import TrackRow

logger: Logger = getLogger(__name__)


class SpotifyProvider(BaseProvider):
    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Spotify.provider_name = provider_name
        Spotify.provider = self

        self._id = provider_id
        self._name = provider_name

    async def async_init(self) -> None:
        await self.add_enum_contents()

    async def add_enum_contents(self) -> None:
        """Populate provider-owned enum tables in the database."""

        await EnumAccess.check_enum_contents_async(
            enum_class=CopyrightTypeEnum,
            table=CopyrightTypeEnumRow)

    async def search_async(self, query: str) -> AResult[List[BaseSearchItem]]:
        """Search Spotify and return a list of search items."""

        a_result: AResult[List[BaseSearchItem]] = await Spotify.search_async(query)
        if a_result.is_not_ok():
            logger.error(f"Error searching Spotify. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def get_song_async(self, public_id: str) -> AResult[BaseSongResponse]:
        """Get a Spotify track by public_id."""

        a_result: AResult[SongResponse] = await Spotify.get_track_async(public_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting Spotify track. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def get_album_async(self, public_id: str) -> AResult[BaseAlbumResponse]:
        """Get a Spotify album by public_id."""

        a_result_spotify_id: AResult[str] = await SpotifyAccess.get_spotify_id_from_public_id_async(public_id=public_id)
        if a_result_spotify_id.is_not_ok():
            logger.error(f"Error getting spotify_id from public_id. {a_result_spotify_id.info()}")
            return AResult(code=a_result_spotify_id.code(), message=a_result_spotify_id.message())

        spotify_id: str = a_result_spotify_id.result()

        a_result: AResult[AlbumResponse] = await Spotify.get_album_async(spotify_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting Spotify album. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def get_artist_async(self, public_id: str) -> AResult[BaseArtistResponse]:
        """Get a Spotify artist by public_id."""

        a_result: AResult[BaseArtistResponse] = await Spotify.get_artist_async(public_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting Spotify artist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def get_playlist_async(self, public_id: str) -> AResult[BasePlaylistResponse]:
        """Get a Spotify playlist by public_id."""

        a_result: AResult[BasePlaylistResponse] = await Spotify.get_playlist_async(public_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting Spotify playlist. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    async def start_download_async(self, public_id: str, download_id: int) -> AResult[BaseDownload]:
        """Create a SpotifyDownload for the given track public_id."""

        a_result: AResult[TrackRow] = await SpotifyAccess.get_track_spotify_id_async(spotify_id=public_id)
        if a_result.is_not_ok():
            logger.error(f"Error getting track for download. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        track: TrackRow = a_result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=SpotifyDownload(
                public_id=public_id,
                download_id=download_id,
                track_id=track.id,
                download_url=track.download_url,
            ),
        )


provider = SpotifyProvider()
name = "Spotify"
