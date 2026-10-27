import re
from logging import Logger
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.enumAccess import EnumAccess
from core.framework.downloader.baseDownload import BaseDownload
from core.framework.models.urlPattern import UrlPattern
from core.framework.objectFiles import ObjectFiles
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.framework.provider.types import AddFromUrlResult
from core.responses.artistPageResponse import ArtistCatalogResponse
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.baseArtistResponse import BaseArtistResponse
from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.searchResponse import BaseSearchResultsItem
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode
from spotifyScrapper.access.artistCatalogAccess import ArtistCatalogAccess
from spotifyScrapper.access.spotifyScrapperAccess import SpotifyScrapperAccess
from spotifyScrapper.access.db.ormEnums.copyrightTypeEnum import (
    CopyrightTypeEnumRow,
)
from spotifyScrapper.access.trackAccess import TrackAccess
from spotifyScrapper.enums.copyrightTypeEnum import CopyrightTypeEnum
from spotifyScrapper.framework.download.spotifyScrapperDownload import (
    SpotifyScrapperDownload,
)
from spotifyScrapper.framework.spotifyScrapper import SpotifyScrapper
from spotifyScrapper.responses.albumResponse import (
    SpotifyScrapperAlbumResponse,
)
from spotifyScrapper.utils.conversions import (
    get_artists_responses_async,
    get_playlist_with_medias_response_async,
    get_playlist_without_medias_response_async,
    get_tracks_responses_async,
)

from core.framework.audio.silence import request_bounds
from core.responses.audioBoundsResponse import AudioBoundsResponse

logger: Logger = getLogger(__name__)

SPOTIFY_SCRAPPER_URL_PATTERNS: list[UrlPattern] = [
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/track/([a-zA-Z0-9]+)"),
        path_template="/spotify_scrapper/track/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/album/([a-zA-Z0-9]+)"),
        path_template="/spotify_scrapper/album/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/artist/([a-zA-Z0-9]+)"),
        path_template="/spotify_scrapper/artist/{}",
    ),
    UrlPattern(
        pattern=re.compile(r"https?://open\.spotify\.com/playlist/([a-zA-Z0-9]+)"),
        path_template="/spotify_scrapper/playlist/{}",
    ),
]


class SpotifyScrapperProvider(BaseMediaProvider):
    async def get_audio_bounds_async(
        self, session: AsyncSession, media_id: int
    ) -> AResult[AudioBoundsResponse]:
        """Resolve provider-owned downloaded audio for optional boundary analysis."""
        result = await TrackAccess.get_track_by_id_async(
            session=session, track_id=media_id
        )
        if result.is_not_ok():
            logger.error(f"Could not resolve audio source. {result.info()}")
            return AResult(code=result.code(), message=result.message())
        path = result.result().path
        bounds = await request_bounds(
            path=os.path.join(MEDIA_PATH, path) if path else None
        )
        return AResult(code=AResultCode.OK, message="OK", result=bounds)

    async def get_artist_catalog_async(
        self, session: AsyncSession, name: str, public_id: str | None = None
    ) -> Result[ArtistCatalogResponse]:
        """Expose this provider's indexed artist catalog to Core."""
        return await ArtistCatalogAccess.get_async(session=session, name=name, public_id=public_id)

    def download_concurrency_limit(self) -> int:
        return 2

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
        SpotifyScrapper.provider_name = provider_name
        SpotifyScrapper.provider = self

        self._id = provider_id
        self._name = provider_name

    async def async_init(self, session: AsyncSession) -> None:
        await self.add_enum_contents(session=session)

    async def add_enum_contents(self, session: AsyncSession) -> None:
        await EnumAccess.check_enum_contents_async(
            session=session, enum_class=CopyrightTypeEnum, table=CopyrightTypeEnumRow
        )

    async def search_page_async(
        self,
        session: AsyncSession,
        query: str,
        limit: int = 15,
        media_type: str | None = None,
    ) -> Result[list[BaseSearchResultsItem]]:
        result = await SpotifyScrapper.search_async(query=query, limit=limit)
        if result.is_not_ok():
            logger.error(f"Search unavailable. {result.info()}")
            return Result(code=result.code(), message=result.message())
        items = result.result()
        ids = [item.providerUrl.rsplit("/", 1)[-1] for item in items if item.type == "song"]
        local = await SpotifyScrapperAccess.get_downloaded_search_ids_async(session=session, spotify_ids=ids)
        if local.is_not_ok():
            logger.error(f"Local search availability unavailable. {local.info()}")
            return result
        identities = local.result()
        for item in items:
            if item.type == "song":
                item.publicId = identities.get(item.providerUrl.rsplit("/", 1)[-1])
                item.downloaded = item.publicId is not None
        return Result(code=ResultCode.OK, message="OK", result=items)

    def search_page_size(self) -> int:
        return 100

    @time_it
    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> Result[list[BaseSearchResultsItem]]:
        return await self.search_page_async(session=session, query=query)

        a_result: Result[list[BaseSearchResultsItem]] = await SpotifyScrapper.search_async(query)
        if a_result.is_not_ok():
            logger.error(f"Error searching Spotify scrapper. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @time_it
    async def get_songs_async(
        self, session: AsyncSession, public_ids: list[str]
    ) -> Result[list[BaseSongWithAlbumResponse]]:
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await SpotifyScrapper.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_all = await SpotifyScrapper.get_tracks_async(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_all.is_not_ok():
            return Result(code=a_result_all.code(), message=a_result_all.message())
        a_result_tracks = a_result_all

        a_result_responses = await get_tracks_responses_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
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
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_rows = await SpotifyScrapper.get_album_rows_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_rows.is_not_ok():
            logger.error(f"Error batch-fetching album rows. {a_result_rows.info()}")
            return Result(code=a_result_rows.code(), message=a_result_rows.message())

        album_rows = a_result_rows.result()

        found_pids = {row.core_album.public_id for row in album_rows}
        missing_pids = [pid for pid in public_ids if pid not in found_pids]

        if missing_pids:
            a_result_missing = await SpotifyScrapper.get_albums_spotify_id_from_public_ids_async(
                session=session, public_ids=missing_pids
            )
            if a_result_missing.is_ok() and a_result_missing.result():
                missing_spotify_ids = list(a_result_missing.result().values())
                await SpotifyScrapper.get_albums_async(
                    session=session, spotify_ids=missing_spotify_ids
                )
                a_result_rows = await SpotifyScrapper.get_album_rows_from_public_ids_async(
                    session=session, public_ids=public_ids
                )
                if a_result_rows.is_ok():
                    album_rows = a_result_rows.result()

        from spotifyScrapper.utils.conversions import (
            get_albums_with_songs_responses_async,
        )

        a_result: Result[
            list[SpotifyScrapperAlbumResponse]
        ] = await get_albums_with_songs_responses_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
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
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await SpotifyScrapper.get_artists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        await SpotifyScrapper.get_artists_async(session=session, spotify_ids=spotify_ids)

        a_result_artists = await SpotifyScrapper.get_artists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_artists.is_not_ok():
            return Result(code=a_result_artists.code(), message=a_result_artists.message())

        a_result_responses = await get_artists_responses_async(
            session=session,
            provider_name=SpotifyScrapper.provider_name,
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
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await SpotifyScrapper.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        await SpotifyScrapper.get_playlists_async(session=session, spotify_ids=spotify_ids)

        a_result_playlists = await SpotifyScrapper.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_playlists.is_not_ok():
            return Result(code=a_result_playlists.code(), message=a_result_playlists.message())

        results: list[BasePlaylistWithMediasResponse] = []
        for playlist_row in a_result_playlists.result():
            a_result = await get_playlist_with_medias_response_async(
                session=session,
                provider_name=SpotifyScrapper.provider_name,
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
        if not public_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        a_result_mapping = await SpotifyScrapper.get_playlists_spotify_id_from_public_ids_async(
            session=session, public_ids=public_ids
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        public_id_to_spotify_id: dict[str, str] = a_result_mapping.result()
        spotify_ids = list(public_id_to_spotify_id.values())

        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])

        await SpotifyScrapper.get_playlists_async(session=session, spotify_ids=spotify_ids)

        a_result_playlists = await SpotifyScrapper.get_playlists_from_db(
            session=session, spotify_ids=spotify_ids
        )
        if a_result_playlists.is_not_ok():
            return Result(code=a_result_playlists.code(), message=a_result_playlists.message())

        results: list[BasePlaylistWithoutMediasResponse] = []
        for playlist_row in a_result_playlists.result():
            a_result = await get_playlist_without_medias_response_async(
                session=session,
                provider_name=SpotifyScrapper.provider_name,
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
        a_result_mapping = await SpotifyScrapper.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            logger.error(f"Error resolving public_id. {a_result_mapping.info()}")
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            return Result(code=ResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await SpotifyScrapper.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            logger.error(f"Error getting track for download. {a_result_tracks.info()}")
            return Result(code=a_result_tracks.code(), message=a_result_tracks.message())

        track = a_result_tracks.result()[0]
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=SpotifyScrapperDownload(
                public_id=public_id,
                download_id=download_id,
                download_group_id=download_group_id,
                user_id=user_id,
                track_spotify_id=track.id,
                download_url=track.download_url,
            ),
        )

    def match_url(self, url: str) -> str | None:
        for up in SPOTIFY_SCRAPPER_URL_PATTERNS:
            match = up.pattern.match(url)
            if match:
                return up.path_template.format(match.group(1))
        return None

    async def add_from_url_async(self, session: AsyncSession, url: str) -> Result[AddFromUrlResult]:
        """Add a Spotify track/album/artist/playlist from URL to the database."""
        internal_path: str | None = self.match_url(url)
        if not internal_path:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Invalid Spotify URL",
            )

        parts = internal_path.strip("/").split("/")
        if len(parts) < 3:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Invalid Spotify URL path",
            )

        resource_type = parts[1]
        resource_id = parts[2]

        if resource_type == "track":
            a_result = await SpotifyScrapper.get_track_async(
                session=session, spotify_id=resource_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error adding Spotify track from URL. {a_result.info()}")
                return Result(code=a_result.code(), message=a_result.message())

            return Result[AddFromUrlResult](
                code=ResultCode.OK,
                message="OK",
                result=a_result.result(),
            )

        elif resource_type == "album":
            a_result = await SpotifyScrapper.get_album_async(
                session=session, spotify_id=resource_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error adding Spotify album from URL. {a_result.info()}")
                return Result(code=a_result.code(), message=a_result.message())

            return Result[AddFromUrlResult](
                code=ResultCode.OK,
                message="OK",
                result=a_result.result(),
            )

        elif resource_type == "artist":
            a_result = await SpotifyScrapper.get_artist_async(
                session=session, spotify_id=resource_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error adding Spotify artist from URL. {a_result.info()}")
                return Result(code=a_result.code(), message=a_result.message())

            return Result[AddFromUrlResult](
                code=ResultCode.OK,
                message="OK",
                result=a_result.result(),
            )

        elif resource_type == "playlist":
            a_result = await SpotifyScrapper.get_playlist_with_medias_async(
                session=session, spotify_id=resource_id
            )
            if a_result.is_not_ok():
                logger.error(f"Error adding Spotify playlist from URL. {a_result.info()}")
                return Result(code=a_result.code(), message=a_result.message())

            return Result[AddFromUrlResult](
                code=ResultCode.OK,
                message="OK",
                result=a_result.result(),
            )

        else:
            return Result(
                code=ResultCode.BAD_REQUEST,
                message=f"Unknown Spotify resource type: {resource_type}",
            )

    def get_stats_media_info_cte_fragment(self) -> str | None:
        from core.enums.mediaTypeEnum import MediaTypeEnum

        return f"""    SELECT t.id                                           AS media_id,
           COALESCE(t.real_duration_ms, t.duration_ms)   AS duration_ms,
           cm.public_id                                   AS public_id,
           t.name                                         AS media_name,
           ci.id AS image_id,
           {MediaTypeEnum.SONG.value}                     AS media_type_key
    FROM   spotify_scrapper.track t
    JOIN   core.media    cm ON cm.id = t.id
    JOIN   spotify_scrapper.album al ON al.id = t.album_id
    JOIN   core.image    ci ON ci.id = al.image_id"""

    def get_stats_artist_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id               AS media_id,
           cm_a.public_id     AS artist_public_id,
           a.name             AS artist_name,
           ai.id AS artist_image_id
    FROM   spotify_scrapper.track       t
    JOIN   spotify_scrapper.track_artist ta   ON ta.track_id  = t.id
    JOIN   spotify_scrapper.artist       a    ON a.id         = ta.artist_id
    JOIN   core.media           cm_a ON cm_a.id      = a.id
    JOIN   core.image           ai   ON ai.id        = a.image_id"""

    def get_stats_album_info_cte_fragment(self) -> str | None:
        return """    SELECT t.id              AS media_id,
           cm_al.public_id   AS album_public_id,
           al.name           AS album_name,
           ai.id             AS album_image_id,
           (SELECT string_agg(DISTINCT artist.name, ', ' ORDER BY artist.name)
            FROM spotify_scrapper.album_artist aa
            JOIN spotify_scrapper.artist artist ON artist.id = aa.artist_id
            WHERE aa.album_id = al.id) AS album_artists
    FROM   spotify_scrapper.track t
    JOIN   spotify_scrapper.album   al    ON al.id    = t.album_id
    JOIN   core.media      cm_al ON cm_al.id = al.id
    JOIN   core.image      ai    ON ai.id    = al.image_id"""

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
    FROM   spotify_scrapper.track t
    JOIN   core.media    cm ON cm.id = t.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   spotify_scrapper.album al ON al.id = t.album_id
    JOIN   core.image    ci ON ci.id = al.image_id
    LEFT JOIN spotify_scrapper.track_artist ta ON ta.track_id = t.id
    LEFT JOIN spotify_scrapper.artist     ar ON ar.id = ta.artist_id
    GROUP BY cm.id, cm.public_id, t.name, al.name, p.name, ci.id
    UNION ALL
    SELECT cm.id                       AS internal_id,
           cm.public_id                 AS public_id,
           al.name                      AS name,
           NULLIF(string_agg(DISTINCT ar.name, ', '), '') AS subtitle,
           {MediaTypeEnum.ALBUM.value}  AS media_type_key,
           p.name                       AS provider_name,
           ci.id AS image_id
    FROM   spotify_scrapper.album al
    JOIN   core.media    cm ON cm.id = al.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = al.image_id
    LEFT JOIN spotify_scrapper.album_artist aa ON aa.album_id = al.id
    LEFT JOIN spotify_scrapper.artist     ar ON ar.id = aa.artist_id
    GROUP BY cm.id, cm.public_id, al.name, p.name, ci.id
    UNION ALL
    SELECT cm.id                        AS internal_id,
           cm.public_id                  AS public_id,
           a.name                        AS name,
           NULL                          AS subtitle,
           {MediaTypeEnum.ARTIST.value}  AS media_type_key,
           p.name                        AS provider_name,
           ci.id AS image_id
    FROM   spotify_scrapper.artist a
    JOIN   core.media    cm ON cm.id = a.id
    JOIN   core.provider p  ON p.id = cm.provider_id
    JOIN   core.image    ci ON ci.id = a.image_id"""

    async def get_media_duration_ms_async(
        self, session: AsyncSession, public_id: str
    ) -> Result[int]:
        a_result_mapping = await SpotifyScrapper.get_tracks_spotify_id_from_public_ids_async(
            session=session, public_ids=[public_id]
        )
        if a_result_mapping.is_not_ok():
            return Result(code=a_result_mapping.code(), message=a_result_mapping.message())

        mapping = a_result_mapping.result()
        spotify_id = mapping.get(public_id)
        if not spotify_id:
            return Result(code=ResultCode.NOT_FOUND, message="Track not found")

        a_result_tracks = await SpotifyScrapper.get_tracks_from_db(
            session=session, spotify_ids=[spotify_id]
        )
        if a_result_tracks.is_not_ok() or not a_result_tracks.result():
            return Result(code=a_result_tracks.code(), message=a_result_tracks.message())

        duration_ms = a_result_tracks.result()[0].duration_ms or 0
        return Result(code=ResultCode.OK, message="OK", result=duration_ms)

    async def delete_media_async(self, session: AsyncSession, public_id: str) -> ResultCode:
        a_result_mapping = await SpotifyScrapper.get_tracks_spotify_id_from_public_ids_async(
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

        a_result_tracks = await SpotifyScrapper.get_tracks_from_db(
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


provider = SpotifyScrapperProvider()
name = "SpotifyScrapper"
