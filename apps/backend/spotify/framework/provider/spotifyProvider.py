import re
from logging import Logger
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.enumAccess import EnumAccess
from core.framework.audio.silence import request_bounds
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.models.localSong import LocalSong
from core.framework.models.urlPattern import UrlPattern
from core.framework.objectFiles import ObjectFiles
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.responses.artistPageResponse import ArtistCatalogResponse
from core.responses.audioBoundsResponse import AudioBoundsResponse
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode
from spotify.access.artistCatalogAccess import ArtistCatalogAccess
from spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow
from spotify.access.spotifyAccess import SpotifyAccess
from spotify.access.trackAccess import TrackAccess
from spotify.enums.copyrightTypeEnum import CopyrightTypeEnum
from spotify.framework.download.spotifyDownload import SpotifyDownload
from spotify.framework.spotify import Spotify
from spotify.responses.albumResponse import SpotifyAlbumResponse
from spotify.utils.conversions import (
    get_artists_responses_async,
    get_playlist_with_medias_response_async,
    get_playlist_without_medias_response_async,
    get_tracks_responses_async,
)

logger: Logger = getLogger(__name__)

SPOTIFY_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/track/([a-zA-Z0-9]+)"),
        path_template="/spotify/track/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/album/([a-zA-Z0-9]+)"),
        path_template="/spotify/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/artist/([a-zA-Z0-9]+)"),
        path_template="/spotify/artist/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/playlist/([a-zA-Z0-9]+)"),
        path_template="/spotify/playlist/{}",
    ),
]


class SpotifyProvider(BaseMediaProvider):
    async def find_local_songs_async(
        self, session: AsyncSession, titles: list[str]
    ) -> Result[list[LocalSong]]:
        """Resolve local recordings regardless of this provider's remote health."""
        return await SpotifyAccess.find_local_songs_async(session=session, titles=titles)

    async def get_local_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        """Build playback metadata using only the local database, never the API."""
        mapping = await SpotifyAccess.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if mapping.is_not_ok():
            logger.error(f"Local identity lookup failed. {mapping.info()}")
            return Result(code=mapping.code(), message=mapping.message())
        tracks = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=list(mapping.result().values())
        )
        if tracks.is_not_ok():
            logger.error(f"Local song lookup failed. {tracks.info()}")
            return Result(code=tracks.code(), message=tracks.message())
        converted = await get_tracks_responses_async(
            session=session,
            provider_name=self.get_name(),
            track_rows=[track for track in tracks.result() if track.storage_object is not None],
        )
        if converted.is_not_ok():
            logger.error(f"Local metadata conversion failed. {converted.info()}")
            return Result(code=converted.code(), message=converted.message())
        songs: list[BaseSongWithAlbumResponse] = [song for song in converted.result()]
        return Result(code=ResultCode.OK, message="OK", result=songs)

    async def get_audio_bounds_async(
        self, session: AsyncSession, media_id: int
    ) -> Result[AudioBoundsResponse]:
        """Resolve provider-owned downloaded audio for optional boundary analysis."""
        result = await TrackAccess.get_track_by_id_async(session=session, track_id=media_id)
        if result.is_not_ok():
            logger.error(f"Could not resolve audio source. {result.info()}")
            return Result(code=result.code(), message=result.message())
        storage_object = result.result().storage_object
        bounds = await request_bounds(path=storage_object.key if storage_object else None)
        return Result(code=ResultCode.OK, message="OK", result=bounds)

    async def get_artist_catalog_async(
        self, session: AsyncSession, name: str, public_id: str | None = None
    ) -> Result[ArtistCatalogResponse]:
        """Expose this provider's indexed artist catalog to Core."""
        return await ArtistCatalogAccess.get_async(session=session, name=name, public_id=public_id)

    def download_cooldown_remaining(self) -> float:
        from youtube.framework.youtubeGate import youtube_gate

        return youtube_gate.cooldown_remaining()

    async def check_health_async(self) -> ResultCode:
        """Check the downloader used by this provider even if its source is disabled."""
        from youtube.framework.potProvider import PotProvider

        health = await PotProvider.check_health_async(max_age_seconds=30.0)
        return ResultCode(code=health.code(), message=health.message())

    def can_manage_downloads(self) -> bool:
        return True

    def __init__(self) -> None:
        super().__init__()

    def set_info(self, provider_id: int, provider_name: str) -> None:
        Spotify.provider_name = provider_name
        Spotify.provider = self

        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession) -> None:
        await self.add_enum_contents(session=session)

    async def add_enum_contents(self, session: AsyncSession) -> None:
        """Populate provider-owned enum tables in the database."""

        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=CopyrightTypeEnum, table=CopyrightTypeEnumRow
        )

    @time_it
    async def get_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        """Get Spotify tracks by public_ids — bulk with minimal DB queries."""

        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_all = await Spotify.get_tracks_async(session=session, spotify_ids=spotify_ids)
        if a_result_all.is_not_ok():
            return Result(code=a_result_all.code(), message=a_result_all.message())
        a_result_tracks = a_result_all

        a_result_responses = await get_tracks_responses_async(
            session=session,
            provider_name=Spotify.provider_name,
            track_rows=a_result_tracks.result(),
        )
        if a_result_responses.is_not_ok():
            return Result(code=a_result_responses.code(), message=a_result_responses.message())

        track_by_public_id: dict[str, BaseSongWithAlbumResponse] = {
            r.publicId: r for r in a_result_responses.result()
        }

        results: list[BaseSongWithAlbumResponse] = [
            track_by_public_id[pid] for pid in public_ids if pid in track_by_public_id
        ]
        return Result(code=ResultCode.OK, message="OK", result=results)

    @time_it
    async def get_albums_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseAlbumWithSongsResponse]]:
        """Get Spotify albums by public_ids — batched to minimise DB round-trips."""

        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_rows = await Spotify.get_album_rows_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_rows.is_not_ok():
            logger.error(f"Error batch-fetching album rows. {a_result_rows.info()}")
            return Result(code=a_result_rows.code(), message=a_result_rows.message())

        album_rows = a_result_rows.result()

        found_pids = {row.core_album.public_id for row in album_rows}
        missing_pids = [pid for pid in public_ids if pid not in found_pids]

        if missing_pids:
            a_result_missing = await Spotify.get_albums_spotify_id_from_public_ids_async(
                session=session, public_ids=missing_pids
            )
            if a_result_missing.is_ok() and a_result_missing.result():
                missing_spotify_ids = list(a_result_missing.result().values())
                await Spotify.get_albums_async(session=session, spotify_ids=missing_spotify_ids)
                a_result_rows = await Spotify.get_album_rows_from_public_ids_async(
                    session=session, public_ids=public_ids
                )
                if a_result_rows.is_ok():
                    album_rows = a_result_rows.result()

        from spotify.utils.conversions import (
            get_albums_with_songs_responses_async,
        )

        a_result: Result[list[SpotifyAlbumResponse]] = await get_albums_with_songs_responses_async(
            session=session,
            provider_name=Spotify.provider_name,
            album_rows=album_rows,
        )
        if a_result.is_not_ok():
            return Result(code=a_result.code(), message=a_result.message())

        album_by_public_id: dict[str, BaseAlbumWithSongsResponse] = {
            r.publicId: r for r in a_result.result()
        }

        results: list[BaseAlbumWithSongsResponse] = [
            album_by_public_id[pid] for pid in public_ids if pid in album_by_public_id
        ]
        return Result(code=ResultCode.OK, message="OK", result=results)

    @time_it
    async def get_artists_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseArtistResponse]]:
        """Get Spotify artists by public_ids — bulk with minimal DB queries."""

        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_artists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        await Spotify.get_artists_async(session=session, spotify_ids=spotify_ids)

        a_result_artists = await Spotify.get_artists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_artists.is_not_ok():
            return Result(code=a_result_artists.code(), message=a_result_artists.message())

        a_result_responses = await get_artists_responses_async(
            session=session,
            provider_name=Spotify.provider_name,
            artist_rows=a_result_artists.result(),
        )
        if a_result_responses.is_not_ok():
            return Result(code=a_result_responses.code(), message=a_result_responses.message())

        artist_by_public_id: dict[str, BaseArtistResponse] = {
            r.publicId: r for r in a_result_responses.result()
        }

        results: list[BaseArtistResponse] = [
            artist_by_public_id[pid] for pid in public_ids if pid in artist_by_public_id
        ]
        return Result(code=ResultCode.OK, message="OK", result=results)

    @time_it
    async def get_playlists_with_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithMediasResponse]]:
        """Get Spotify playlists by public_ids with medias — bulk."""

        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        await Spotify.get_playlists_async(session=session, spotify_ids=spotify_ids)

        a_result_playlists = await Spotify.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_playlists.is_not_ok():
            return Result(code=a_result_playlists.code(), message=a_result_playlists.message())

        results: list[BasePlaylistWithMediasResponse] = []
        for playlist_row in a_result_playlists.result():
            a_result = await get_playlist_with_medias_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                playlist_row=playlist_row,
            )
            if a_result.is_ok():
                results.append(a_result.result())

        playlist_by_public_id: dict[str, BasePlaylistWithMediasResponse] = {
            r.publicId: r for r in results
        }

        ordered: list[BasePlaylistWithMediasResponse] = [
            playlist_by_public_id[pid] for pid in public_ids if pid in playlist_by_public_id
        ]
        return Result(code=ResultCode.OK, message="OK", result=ordered)

    @time_it
    async def get_playlists_without_medias_async(
        self, session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[BasePlaylistWithoutMediasResponse]]:
        """Get Spotify playlists by public_ids without medias — bulk."""

        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await Spotify.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        await Spotify.get_playlists_async(session=session, spotify_ids=spotify_ids)

        a_result_playlists = await Spotify.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_playlists.is_not_ok():
            return Result(code=a_result_playlists.code(), message=a_result_playlists.message())

        results: list[BasePlaylistWithoutMediasResponse] = []
        for playlist_row in a_result_playlists.result():
            a_result = await get_playlist_without_medias_response_async(
                session=session,
                provider_name=Spotify.provider_name,
                playlist_row=playlist_row,
            )
            if a_result.is_ok():
                results.append(a_result.result())

        playlist_by_public_id: dict[str, BasePlaylistWithoutMediasResponse] = {
            r.publicId: r for r in results
        }

        ordered: list[BasePlaylistWithoutMediasResponse] = [
            playlist_by_public_id[pid] for pid in public_ids if pid in playlist_by_public_id
        ]
        return Result(code=ResultCode.OK, message="OK", result=ordered)

    async def start_download_async(
        self,
        session: AsyncSession,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
    ) -> Result[BaseDownload]:
        """Create a SpotifyDownload for the given track public_id."""

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            logger.error(f"Error resolving public_id. {a_result_mapping.info()}")
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            return Result(code=ResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            logger.error(f"Error getting track for download. {a_result_tracks.info()}")
            return Result(code=a_result_tracks.code(), message=a_result_tracks.message())

        track = a_result_tracks.result()[0]
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=SpotifyDownload(
                public_id=public_id,
                download_id=download_id,
                download_group_id=download_group_id,
                user_id=user_id,
                track_spotify_id=track.id,
                download_url=track.download_url,
            ),
        )

    def get_stats_media_info_cte_fragment(self) -> str | None:
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT t.id                                           AS media_id,
           COALESCE(t.real_duration_ms, t.duration_ms)   AS duration_ms,
           cm.public_id                                   AS public_id,
           t.name                                         AS media_name,
           ci.id AS image_id,
           {MediaTypeEnum.SONG.value}                     AS media_type_key
    FROM   spotify.track t
    JOIN   core.media    cm ON cm.id = t.id
    JOIN   spotify.album al ON al.id = t.album_id
    JOIN   core.image    ci ON ci.id = al.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id               AS media_id,
           cm_a.public_id     AS artist_public_id,
           a.name             AS artist_name,
           ai.id AS artist_image_id
    FROM   spotify.track       t
    JOIN   spotify.track_artist ta   ON ta.track_id  = t.id
    JOIN   spotify.artist       a    ON a.id         = ta.artist_id
    JOIN   core.media           cm_a ON cm_a.id      = a.id
    JOIN   core.image           ai   ON ai.id        = a.image_id"""

    def get_stats_album_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id              AS media_id,
           cm_al.public_id   AS album_public_id,
           al.name           AS album_name,
           ai.id             AS album_image_id,
           (SELECT string_agg(DISTINCT artist.name, ', ' ORDER BY artist.name)
            FROM spotify.album_artist aa
            JOIN spotify.artist artist ON artist.id = aa.artist_id
            WHERE aa.album_id = al.id) AS album_artists
    FROM   spotify.track t
    JOIN   spotify.album   al    ON al.id    = t.album_id
    JOIN   core.media      cm_al ON cm_al.id = al.id
    JOIN   core.image      ai    ON ai.id    = al.image_id"""

    def get_stats_genre_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id     AS media_id,
           g.name   AS genre_name
    FROM   spotify.track        t
    JOIN   spotify.track_artist ta ON ta.track_id  = t.id
    JOIN   spotify.artist_genre ag ON ag.artist_id = ta.artist_id
    JOIN   spotify.genre        g  ON g.id         = ag.genre_id"""

    def get_collection_provider_url(self, metadata: dict[str, Any], media_type_key: int) -> str:
        """Build a source link without loading collection contents."""
        external_id = metadata.get("external_id") or metadata.get("spotify_id")
        kind = "album" if media_type_key == 2 else "playlist"
        return f"https://open.spotify.com/{kind}/{external_id}" if external_id else ""

    def get_search_index_cte_fragment(self) -> str | None:
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT cm.id                       AS internal_id,
           cm.public_id                 AS public_id,
           t.name                       AS name,
           CONCAT_WS(', ',
               NULLIF(string_agg(DISTINCT ar.name, ', '), ''),
               NULLIF(al.name, '')
           )                            AS subtitle,
           {MediaTypeEnum.SONG.value}   AS media_type_key,
           p.name                       AS provider_name,
           ci.id AS image_id
    FROM   spotify.track t
    JOIN   core.media    cm ON cm.id = t.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   spotify.album al ON al.id = t.album_id
    JOIN   core.image    ci ON ci.id = al.image_id
    LEFT JOIN spotify.track_artist ta ON ta.track_id = t.id
    LEFT JOIN spotify.artist     ar ON ar.id = ta.artist_id
    GROUP BY cm.id, cm.public_id, t.name, al.name, p.name, ci.id
    UNION ALL
    SELECT cm.id                       AS internal_id,
           cm.public_id                 AS public_id,
           al.name                      AS name,
           NULLIF(string_agg(DISTINCT ar.name, ', '), '') AS subtitle,
           {MediaTypeEnum.ALBUM.value}  AS media_type_key,
           p.name                       AS provider_name,
           ci.id AS image_id
    FROM   spotify.album al
    JOIN   core.media    cm ON cm.id = al.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = al.image_id
    LEFT JOIN spotify.album_artist aa ON aa.album_id = al.id
    LEFT JOIN spotify.artist     ar ON ar.id = aa.artist_id
    GROUP BY cm.id, cm.public_id, al.name, p.name, ci.id
    UNION ALL
    SELECT cm.id                        AS internal_id,
           cm.public_id                  AS public_id,
           a.name                        AS name,
           NULL                          AS subtitle,
           {MediaTypeEnum.ARTIST.value}  AS media_type_key,
           p.name                        AS provider_name,
           ci.id AS image_id
    FROM   spotify.artist a
    JOIN   core.media    cm ON cm.id = a.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = a.image_id"""

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> Result[int]:
        """Get the duration of a Spotify track in milliseconds."""

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            return Result(code=ResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            return Result(code=a_result_tracks.code(), message=a_result_tracks.message())

        duration_ms = a_result_tracks.result()[0].duration_ms or 0
        return Result(code=ResultCode.OK, message="OK", result=duration_ms)

    async def delete_media_async(self, session: AsyncSession, public_id: str) -> ResultCode:
        """Remove the media file for a Spotify track and reset its path in the database."""

        a_result_mapping = await Spotify.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            logger.error(f"Error resolving public_id. {a_result_mapping.info()}")
            return ResultCode(code=a_result_mapping.code(), message=a_result_mapping.message())

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            logger.error(f"No spotify_id found for public_id {public_id}")
            return ResultCode(code=ResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await Spotify.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            logger.error(f"Error getting track from DB. {a_result_tracks.info()}")
            return ResultCode(code=a_result_tracks.code(), message=a_result_tracks.message())

        track = a_result_tracks.result()[0]

        if track.storage_object:
            full_path: str = track.storage_object.key
            await ObjectFiles.archive_async(full_path)

        a_result_clear = await TrackAccess.clear_track_path_async(
            session=session, track_id=track.id
        )
        if a_result_clear.is_not_ok():
            logger.error(f"Error clearing track path. {a_result_clear.info()}")
            return ResultCode(code=a_result_clear.code(), message=a_result_clear.message())

        return ResultCode(code=ResultCode.OK, message="OK")


provider = SpotifyProvider()
name = "Spotify"
