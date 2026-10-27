from datetime import UTC, datetime
from typing import cast

from sqlalchemy import Result as DBResult
from sqlalchemy import Select, and_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework.media.image import Image
from core.framework.models.localSong import LocalSong
from core.utils.createId import create_id
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode
from spotifyScrapper.access.db.associationTables.album_artists import (
    album_artists,
)
from spotifyScrapper.access.db.associationTables.album_external_images import (
    album_external_images,
)
from spotifyScrapper.access.db.associationTables.artist_genres import (
    artist_genres,
)
from spotifyScrapper.access.db.associationTables.song_artists import song_artists
from spotifyScrapper.access.db.ormModels.album import AlbumRow
from spotifyScrapper.access.db.ormModels.artist import ArtistRow
from spotifyScrapper.access.db.ormModels.copyright import CopyrightRow
from spotifyScrapper.access.db.ormModels.externalImage import ExternalImageRow
from spotifyScrapper.access.db.ormModels.genre import GenreRow
from spotifyScrapper.access.db.ormModels.playlist import PlaylistRow
from spotifyScrapper.access.db.ormModels.playlist_tracks import (
    PlaylistTrackRow,
)
from spotifyScrapper.access.db.ormModels.track import TrackRow
from spotifyScrapper.enums.copyrightTypeEnum import CopyrightTypeEnum
from spotifyScrapper.framework.models.playlistTrackLink import (
    PlaylistTrackLink,
)
from spotifyScrapper.framework.models.trackWithCoreMedia import (
    TrackWithCoreMedia,
)
from spotifyScrapper.framework.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedArtist,
    ScrappedPlaylist,
    ScrappedTrack,
)

logger = getLogger(__name__)


class SpotifyScrapperAccess:
    @staticmethod
    async def find_local_songs_async(
        session: AsyncSession, titles: list[str]
    ) -> Result[list[LocalSong]]:
        """Batch-read downloaded metadata for local search matching."""
        if not titles:
            return Result(code=ResultCode.OK, message="OK", result=[])
        rows = (
            await session.execute(
                select(CoreMediaRow.public_id, TrackRow.name, StorageObjectRow.key, ArtistRow.name)
                .select_from(TrackRow)
                .join(CoreMediaRow, CoreMediaRow.id == TrackRow.id)
                .join(StorageObjectRow, StorageObjectRow.id == TrackRow.storage_object_id)
                .join(song_artists, song_artists.c.track_id == TrackRow.id)
                .join(ArtistRow, ArtistRow.id == song_artists.c.artist_id)
                .where(
                    func.lower(func.regexp_replace(func.trim(TrackRow.name), r"\s+", " ", "g")).in_(
                        titles
                    ),
                    StorageObjectRow.key != "",
                )
                .limit(1001)
            )
        ).all()
        if len(rows) > 1000:
            logger.warning(
                "Too many Spotify Scrapper local candidates; keeping explicit source selection"
            )
            return Result(code=ResultCode.OK, message="OK", result=[])
        songs: dict[str, LocalSong] = {}
        for public_id, name, path, artist_name in rows:
            if not path:
                continue
            if public_id not in songs:
                songs[public_id] = LocalSong(
                    public_id=public_id, name=name, artists=[], storage_key=path
                )
            songs[public_id].artists.append(artist_name)
        return Result(code=ResultCode.OK, message="OK", result=list(songs.values()))

    @staticmethod
    async def get_downloaded_search_ids_async(
        session: AsyncSession, spotify_ids: list[str]
    ) -> Result[dict[str, str]]:
        """Map exact Spotify identities to playable local songs."""
        if not spotify_ids:
            return Result(code=ResultCode.OK, message="OK", result={})
        result = await session.execute(
            select(TrackRow.spotify_id, CoreMediaRow.public_id)
            .join(CoreMediaRow, TrackRow.id == CoreMediaRow.id)
            .join(StorageObjectRow, StorageObjectRow.id == TrackRow.storage_object_id)
            .where(TrackRow.spotify_id.in_(spotify_ids), StorageObjectRow.key != "")
        )
        return Result(
            code=ResultCode.OK, message="OK", result={row[0]: row[1] for row in result.all()}
        )

    @staticmethod
    @time_it
    async def get_album_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> Result[AlbumRow]:
        try:
            stmt: Select[tuple[AlbumRow]] = (
                select(AlbumRow)
                .options(selectinload(AlbumRow.artists))
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(AlbumRow.spotify_id == spotify_id)
            )
            result: DBResult[tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error(f"Album {spotify_id} not found")
                return Result(code=ResultCode.NOT_FOUND, message=f"Album {spotify_id} not found")

            return Result(code=ResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Failed to get album from id {spotify_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get album from id {spotify_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_album_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[str]:
        try:
            stmt: Select[tuple[AlbumRow]] = (
                select(AlbumRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(CoreMediaRow.public_id == public_id)
            )
            result: DBResult[tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error("Album not found")
                return Result(code=ResultCode.NOT_FOUND, message="Album not found")

            return Result(code=ResultCode.OK, message="OK", result=album.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_track_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[str]:
        try:
            stmt: Select[tuple[TrackRow]] = (
                select(TrackRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == TrackRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                    ),
                )
                .where(CoreMediaRow.public_id == public_id)
            )
            result: DBResult[tuple[TrackRow]] = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error("Track not found")
                return Result(code=ResultCode.NOT_FOUND, message="Track not found")

            return Result(code=ResultCode.OK, message="OK", result=track.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_artist_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[str]:
        try:
            stmt: Select[tuple[ArtistRow]] = (
                select(ArtistRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == ArtistRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ARTIST.value,
                    ),
                )
                .where(CoreMediaRow.public_id == public_id)
            )
            result: DBResult[tuple[ArtistRow]] = await session.execute(stmt)
            artist: ArtistRow | None = result.scalar_one_or_none()

            if not artist:
                logger.error("Artist not found")
                return Result(code=ResultCode.NOT_FOUND, message="Artist not found")

            return Result(code=ResultCode.OK, message="OK", result=artist.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlist_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> Result[str]:
        try:
            stmt: Select[tuple[PlaylistRow]] = (
                select(PlaylistRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == PlaylistRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.PLAYLIST.value,
                    ),
                )
                .where(CoreMediaRow.public_id == public_id)
            )
            result: DBResult[tuple[PlaylistRow]] = await session.execute(stmt)
            playlist: PlaylistRow | None = result.scalar_one_or_none()

            if not playlist:
                logger.error("Playlist not found")
                return Result(code=ResultCode.NOT_FOUND, message="Playlist not found")

            return Result(code=ResultCode.OK, message="OK", result=playlist.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_track_spotify_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> Result[TrackRow]:
        try:
            stmt = (
                select(TrackRow)
                .where(TrackRow.spotify_id == spotify_id)
                .options(selectinload(TrackRow.album))
            )
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.warning(f"Track not found for spotify_id: {spotify_id}")
                return Result(code=ResultCode.NOT_FOUND, message="Track not found")

            return Result(code=ResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track from spotify_id {spotify_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get track from spotify_id {spotify_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_artist_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> Result[ArtistRow]:
        try:
            stmt = select(ArtistRow).where(ArtistRow.spotify_id == spotify_id)
            result = await session.execute(stmt)
            artist: ArtistRow | None = result.scalar_one_or_none()

            if not artist:
                logger.error("Artist not found")
                return Result(code=ResultCode.NOT_FOUND, message="Artist not found")

            return Result(code=ResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Failed to get artist from spotify_id {spotify_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get artist from spotify_id {spotify_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlist_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> Result[PlaylistRow]:
        try:
            stmt = select(PlaylistRow).where(PlaylistRow.spotify_id == spotify_id)
            result = await session.execute(stmt)
            playlist: PlaylistRow | None = result.scalar_one_or_none()

            if not playlist:
                logger.error("Playlist not found")
                return Result(code=ResultCode.NOT_FOUND, message="Playlist not found")

            return Result(code=ResultCode.OK, message="OK", result=playlist)

        except Exception as e:
            logger.error(f"Failed to get playlist from id {spotify_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist from id {spotify_id}: {e}",
            )

    # Image helpers

    @staticmethod
    @time_it
    async def _get_or_create_external_image(
        session: AsyncSession,
        url: str,
        width: int | None,
        height: int | None,
    ) -> Result[ExternalImageRow]:
        try:
            stmt = select(ExternalImageRow).where(ExternalImageRow.url == url)
            result = await session.execute(stmt)
            row: ExternalImageRow | None = result.scalar_one_or_none()
            if row:
                return Result(code=ResultCode.OK, message="OK", result=row)
            row = ExternalImageRow(public_id=create_id(32), url=url, width=width, height=height)
            session.add(row)
            await session.flush()
            return Result(code=ResultCode.OK, message="OK", result=row)
        except IntegrityError:
            logger.warning(
                f"IntegrityError in _get_or_create_external_image for {url}, "
                f"rolling back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(ExternalImageRow).where(ExternalImageRow.url == url)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row:
                return Result(code=ResultCode.OK, message="OK", result=row)
            logger.error(f"External image {url} not found after IntegrityError rollback")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Failed to get or create external image after conflict",
            )
        except Exception as e:
            logger.error(f"Failed to get/create external image: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get/create external image: {e}",
            )

    @staticmethod
    @time_it
    async def _get_or_create_genre(
        session: AsyncSession,
        name: str,
    ) -> Result[GenreRow]:
        try:
            stmt = select(GenreRow).where(GenreRow.name == name)
            result = await session.execute(stmt)
            row: GenreRow | None = result.scalar_one_or_none()
            if row:
                return Result(code=ResultCode.OK, message="OK", result=row)
            row = GenreRow(name=name)
            session.add(row)
            await session.flush()
            return Result(code=ResultCode.OK, message="OK", result=row)
        except IntegrityError:
            logger.warning(
                f"IntegrityError in _get_or_create_genre for {name}, rolling "
                f"back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(GenreRow).where(GenreRow.name == name)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row:
                return Result(code=ResultCode.OK, message="OK", result=row)
            logger.error(f"Genre {name} not found after IntegrityError rollback")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Failed to get or create genre after conflict",
            )
        except Exception as e:
            logger.error(f"Failed to get/create genre: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get/create genre: {e}",
            )

    # ── Entity population helpers ─────────────────────────────────────────────

    @staticmethod
    @time_it
    async def get_or_create_artist(
        session: AsyncSession,
        raw: ScrappedArtist,
        provider_id: int,
        image_id: int | None = None,
    ) -> Result[ArtistRow]:
        try:
            stmt = select(ArtistRow).where(ArtistRow.spotify_id == raw.id)
            result = await session.execute(stmt)
            existing: ArtistRow | None = result.scalar_one_or_none()
            if existing:
                return Result(code=ResultCode.OK, message="OK", result=existing)

            if image_id is None:
                a_result_image: Result[ImageRow] = await Image.get_image_from_key_async(
                    session=session, key="album-placeholder.png"
                )
                if a_result_image.is_ok():
                    image_id = a_result_image.result().id
                else:
                    logger.error(f"Error getting placeholder image: {a_result_image.info()}")
                    return Result(
                        code=ResultCode.GENERAL_ERROR,
                        message="Failed to get placeholder image",
                    )

            core_artist = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.ARTIST.value,
            )
            session.add(core_artist)
            await session.flush()

            artist_row = ArtistRow(
                id=core_artist.id,
                spotify_id=raw.id,
                name=raw.name or "",
                followers=raw.followers,
                popularity=raw.popularity,
                image_id=image_id,
            )
            session.add(artist_row)
            await session.flush()

            if raw.genres:
                for genre_name in raw.genres:
                    a_genre = await SpotifyScrapperAccess._get_or_create_genre(session, genre_name)
                    if a_genre.is_ok():
                        artist_row.genres.add(a_genre.result())  # type: ignore[arg-type]

            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyScrapperAccess._get_or_create_external_image(
                            session, img.url, img.width, img.height
                        )
                        if a_ext.is_ok():
                            artist_row.external_images.add(a_ext.result())  # type: ignore[arg-type]

            await session.flush()
            return Result(code=ResultCode.OK, message="OK", result=artist_row)

        except IntegrityError as e:
            logger.warning(
                f"IntegrityError in get_or_create_artist for {raw.id}, rolling "
                f"back and fetching existing. Error: {e}"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(ArtistRow).where(ArtistRow.spotify_id == raw.id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return Result(code=ResultCode.OK, message="OK", result=existing)
            logger.error(f"Artist {raw.id} not found after IntegrityError rollback")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Failed to get or create artist after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create artist: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get/create artist: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_album(
        session: AsyncSession,
        raw: ScrappedAlbum,
        artist_map: dict[str, ArtistRow],
        provider_id: int,
        image_id: int | None = None,
    ) -> Result[AlbumRow]:
        try:
            stmt = (
                select(AlbumRow)
                .options(selectinload(AlbumRow.artists))
                .where(AlbumRow.spotify_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: AlbumRow | None = result.scalar_one_or_none()
            if existing:
                return Result(code=ResultCode.OK, message="OK", result=existing)

            disc_count = max((t.disc_number or 1) for t in raw.tracks) if raw.tracks else 1

            if image_id is None:
                return Result(
                    code=ResultCode.GENERAL_ERROR,
                    message="Failed to create internal image for album",
                )

            core_album = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.ALBUM.value,
            )
            session.add(core_album)
            await session.flush()

            album_row = AlbumRow(
                id=core_album.id,
                spotify_id=raw.id,
                image_id=image_id,
                name=raw.name or "",
                release_date=raw.release_date or "",
                popularity=raw.popularity,
                disc_count=disc_count,
            )
            session.add(album_row)
            await session.flush()

            if raw.artists:
                for a in raw.artists:
                    if a.id and a.id in artist_map:
                        await session.execute(
                            album_artists.insert().values(
                                album_id=album_row.id,
                                artist_id=artist_map[a.id].id,
                            )
                        )

            if raw.copyrights:
                for c in raw.copyrights:
                    if c.get("type") and c["type"] in CopyrightTypeEnum.__members__:
                        type_key = CopyrightTypeEnum[c["type"]].value
                        cr = CopyrightRow(text=c.get("text", "") or "", type_key=type_key)
                        session.add(cr)
                        await session.flush()
                        album_row.copyrights.add(cr)  # type: ignore[arg-type]

            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyScrapperAccess._get_or_create_external_image(
                            session, img.url, img.width, img.height
                        )
                        if a_ext.is_ok():
                            album_row.external_images.add(a_ext.result())  # type: ignore[arg-type]

            await session.flush()
            return Result(code=ResultCode.OK, message="OK", result=album_row)

        except IntegrityError:
            logger.warning(
                f"IntegrityError in get_or_create_album for {raw.id}, rolling "
                f"back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = (
                select(AlbumRow)
                .options(selectinload(AlbumRow.artists))
                .where(AlbumRow.spotify_id == raw.id)
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return Result(code=ResultCode.OK, message="OK", result=existing)
            logger.error(f"Album {raw.id} not found after IntegrityError rollback")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Failed to get or create album after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create album: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get/create album: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_track(
        session: AsyncSession,
        raw: ScrappedTrack,
        artist_map: dict[str, ArtistRow],
        album_row: AlbumRow,
        provider_id: int,
    ) -> Result[tuple[TrackRow, CoreMediaRow]]:
        try:
            stmt = (
                select(TrackRow)
                .where(TrackRow.spotify_id == raw.id)
                .options(selectinload(TrackRow.album))
            )
            result = await session.execute(stmt)
            existing: TrackRow | None = result.scalar_one_or_none()
            if existing:
                existing_core = await session.get(CoreMediaRow, existing.id)
                if existing_core is None:
                    return Result(
                        code=ResultCode.GENERAL_ERROR,
                        message="CoreMediaRow not found for existing track",
                    )
                return Result(code=ResultCode.OK, message="OK", result=(existing, existing_core))

            core_song = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.SONG.value,
            )
            session.add(core_song)
            await session.flush()

            track_row = TrackRow(
                id=core_song.id,
                spotify_id=raw.id,
                name=raw.name or "",
                duration_ms=raw.duration_ms,
                track_number=raw.track_number,
                disc_number=raw.disc_number,
                album_id=album_row.id,
                popularity=raw.popularity,
                preview_url=raw.preview_url,
            )
            session.add(track_row)
            await session.flush()

            if raw.artists:
                for a in raw.artists:
                    if a.id and a.id in artist_map:
                        track_row.artists.add(artist_map[a.id])  # type: ignore[arg-type]

            await session.flush()
            return Result(code=ResultCode.OK, message="OK", result=(track_row, core_song))

        except IntegrityError:
            logger.warning(
                f"IntegrityError in get_or_create_track for {raw.id}, rolling "
                f"back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = (
                select(TrackRow)
                .where(TrackRow.spotify_id == raw.id)
                .options(selectinload(TrackRow.album))
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                existing_core = await session.get(CoreMediaRow, existing.id)
                if existing_core is None:
                    return Result(
                        code=ResultCode.GENERAL_ERROR,
                        message="CoreMediaRow not found for existing track",
                    )
                return Result(code=ResultCode.OK, message="OK", result=(existing, existing_core))
            logger.error(f"Track {raw.id} not found after IntegrityError rollback")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Failed to get or create track after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create track: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get/create track: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_playlist(
        session: AsyncSession,
        raw: ScrappedPlaylist,
        track_row_map: dict[str, TrackRow],
        provider_id: int,
        image_id: int | None = None,
    ) -> Result[PlaylistRow]:
        try:
            stmt = select(PlaylistRow).where(PlaylistRow.spotify_id == raw.id)
            result = await session.execute(stmt)
            existing: PlaylistRow | None = result.scalar_one_or_none()
            if existing:
                return Result(code=ResultCode.OK, message="OK", result=existing)

            core_playlist = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.PLAYLIST.value,
            )
            session.add(core_playlist)
            await session.flush()

            playlist_row = PlaylistRow(
                id=core_playlist.id,
                spotify_id=raw.id,
                name=raw.name or "",
                owner=raw.owner,
                image_id=image_id,
                followers=0,
                description=raw.description,
            )
            session.add(playlist_row)
            await session.flush()

            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyScrapperAccess._get_or_create_external_image(
                            session, img.url, img.width, img.height
                        )
                        if a_ext.is_ok():
                            playlist_row.external_images.add(a_ext.result())  # type: ignore[arg-type]

            if raw.tracks:
                for item in raw.tracks:
                    if not item.track or not item.track.id:
                        continue
                    track_row = track_row_map.get(item.track.id)
                    if not track_row:
                        continue
                    added_at = datetime.now(UTC)
                    if item.added_at:
                        try:
                            added_at = datetime.fromisoformat(item.added_at.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    pt = PlaylistTrackRow(
                        playlist_id=playlist_row.id,
                        song_id=track_row.id,
                        added_at=added_at,
                        disabled=False,
                        added_by=item.added_by,
                    )
                    session.add(pt)

            await session.flush()
            return Result(code=ResultCode.OK, message="OK", result=playlist_row)

        except IntegrityError:
            logger.warning(
                f"IntegrityError in get_or_create_playlist for {raw.id}, rolling "
                f"back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(PlaylistRow).where(PlaylistRow.spotify_id == raw.id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return Result(code=ResultCode.OK, message="OK", result=existing)
            logger.error(f"Playlist {raw.id} not found after IntegrityError rollback")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Failed to get or create playlist after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create playlist: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get/create playlist: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_from_track_row_async(
        session: AsyncSession,
        track_row: TrackRow,
    ) -> Result[list[ArtistRow]]:
        try:
            stmt: Select[tuple[list[ArtistRow]]] = track_row.artists.select()
            result: DBResult[tuple[list[ArtistRow]]] = await session.execute(stmt)
            artists: list[ArtistRow] = cast(list[ArtistRow], result.scalars().all())

            if not artists:
                logger.error(f"Error getting artists from track row {track_row.id}.")
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"Error getting artists from track row. {track_row.id}",
                )

            return Result(code=ResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists from track row: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from track row: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> Result[list[ArtistRow]]:
        try:
            stmt = (
                select(ArtistRow).join(album_artists).join(AlbumRow).filter(AlbumRow.id == album_id)
            )
            result: DBResult[tuple[ArtistRow]] = await session.execute(stmt)
            artists_list: list[ArtistRow] = cast(list[ArtistRow], result.scalars().all())

            if not artists_list:
                logger.error(f"No artists found for album id {album_id}")
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="No artists found for this album.",
                )

            return Result(code=ResultCode.OK, message="OK", result=artists_list)

        except Exception as e:
            logger.error(f"Failed to get artists from album id {album_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_tracks_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> Result[list[TrackRow]]:
        try:
            stmt = select(TrackRow).where(TrackRow.album_id == album_id)
            result: DBResult[tuple[TrackRow]] = await session.execute(stmt)
            tracks_list: list[TrackRow] = cast(list[TrackRow], result.scalars().all())

            if not tracks_list:
                logger.error(f"No tracks found for album id {album_id}")
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="No tracks found for this album.",
                )

            return Result(code=ResultCode.OK, message="OK", result=tracks_list)

        except Exception as e:
            logger.error(f"Failed to get tracks from album id {album_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_external_images_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> Result[list[ExternalImageRow]]:
        try:
            stmt = (
                select(ExternalImageRow)
                .join(album_external_images)
                .join(AlbumRow)
                .filter(AlbumRow.id == album_id)
            )
            result: DBResult[tuple[ExternalImageRow]] = await session.execute(stmt)
            images_list: list[ExternalImageRow] = cast(
                list[ExternalImageRow], result.scalars().all()
            )

            return Result(code=ResultCode.OK, message="OK", result=images_list)

        except Exception as e:
            logger.error(f"Failed to get external images from album id {album_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get external images from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_tracks_with_core_song_from_album_async(
        session: AsyncSession,
        album_id: int,
    ) -> Result[list[TrackWithCoreMedia]]:
        try:
            stmt = (
                select(TrackRow, CoreMediaRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == TrackRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                    ),
                )
                .where(TrackRow.album_id == album_id)
                .order_by(TrackRow.disc_number, TrackRow.track_number)
            )
            result: DBResult[tuple[TrackRow, CoreMediaRow]] = await session.execute(stmt)
            tracks_with_core: list[TrackWithCoreMedia] = []

            for track_row, core_song_row in result.all():
                tracks_with_core.append(
                    TrackWithCoreMedia(track=track_row, core_media=core_song_row)
                )

            return Result(code=ResultCode.OK, message="OK", result=tracks_with_core)

        except Exception as e:
            logger.error(f"Failed to get tracks with core song from album id {album_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks with core song from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_genres_from_artist_id_async(
        session: AsyncSession,
        artist_id: int,
    ) -> Result[list[str]]:
        try:
            stmt = (
                select(GenreRow)
                .join(artist_genres)
                .join(ArtistRow)
                .filter(ArtistRow.id == artist_id)
            )
            result: DBResult[tuple[GenreRow]] = await session.execute(stmt)
            genres: list[GenreRow] = cast(list[GenreRow], result.scalars().all())

            genre_names: list[str] = [g.name for g in genres]
            return Result(code=ResultCode.OK, message="OK", result=genre_names)

        except Exception as e:
            logger.error(f"Failed to get genres from artist id {artist_id}: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get genres from artist id {artist_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_genres_from_artist_async(
        session: AsyncSession,
        artist: ArtistRow,
    ) -> Result[list[str]]:
        try:
            stmt = (
                select(GenreRow).join(artist_genres).filter(artist_genres.c.artist_id == artist.id)
            )
            result: DBResult[tuple[GenreRow]] = await session.execute(stmt)
            genres: list[GenreRow] = cast(list[GenreRow], result.scalars().all())

            genre_names: list[str] = [g.name for g in genres]
            return Result(code=ResultCode.OK, message="OK", result=genre_names)

        except Exception as e:
            logger.error(f"Failed to get genres from artist: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get genres from artist: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlist_track_links_async(
        session: AsyncSession,
        playlist_id: int,
    ) -> Result[list[PlaylistTrackLink]]:
        try:
            stmt: Select[tuple[PlaylistTrackRow]] = select(PlaylistTrackRow).where(
                PlaylistTrackRow.playlist_id == playlist_id
            )
            result: DBResult[tuple[PlaylistTrackRow]] = await session.execute(stmt)
            playlist_track_rows: list[PlaylistTrackRow] = cast(
                list[PlaylistTrackRow], result.scalars().all()
            )

            track_links: list[PlaylistTrackLink] = []
            for ptr in playlist_track_rows:
                track_stmt = (
                    select(TrackRow)
                    .where(TrackRow.id == ptr.song_id)
                    .options(selectinload(TrackRow.album))
                )
                track_result: DBResult[tuple[TrackRow]] = await session.execute(track_stmt)
                track_row: TrackRow | None = track_result.scalar_one_or_none()
                if track_row:
                    track_links.append(PlaylistTrackLink(playlist_track=ptr, track=track_row))

            return Result(code=ResultCode.OK, message="OK", result=track_links)

        except Exception as e:
            logger.error(f"Failed to get playlist track links: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist track links: {e}",
            )

    # ── Bulk getters ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_album_rows_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[list[AlbumRow]]:
        try:
            if not public_ids:
                return Result(code=ResultCode.OK, message="OK", result=[])

            stmt = (
                select(AlbumRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(CoreMediaRow.public_id.in_(public_ids))
            )
            result = await session.execute(stmt)
            albums: list[AlbumRow] = list(result.scalars().all())
            return Result(code=ResultCode.OK, message="OK", result=albums)

        except Exception as e:
            logger.error(f"Failed to get album rows from public_ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get album rows from public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_albums_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: list[str],
    ) -> Result[list[AlbumRow]]:
        try:
            if not spotify_ids:
                return Result(code=ResultCode.OK, message="OK", result=[])

            stmt = (
                select(AlbumRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(AlbumRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            albums: list[AlbumRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=albums)

        except Exception as e:
            logger.error(f"Failed to get albums by spotify ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get albums by spotify ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_tracks_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: list[str],
    ) -> Result[list[TrackRow]]:
        try:
            if not spotify_ids:
                return Result(code=ResultCode.OK, message="OK", result=[])

            stmt = (
                select(TrackRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == TrackRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                    ),
                )
                .where(TrackRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            tracks: list[TrackRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=tracks)

        except Exception as e:
            logger.error(f"Failed to get tracks by spotify ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks by spotify ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: list[str],
    ) -> Result[list[ArtistRow]]:
        try:
            if not spotify_ids:
                return Result(code=ResultCode.OK, message="OK", result=[])

            stmt = (
                select(ArtistRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == ArtistRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ARTIST.value,
                    ),
                )
                .where(ArtistRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            artists: list[ArtistRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists by spotify ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get artists by spotify ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlists_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: list[str],
    ) -> Result[list[PlaylistRow]]:
        try:
            if not spotify_ids:
                return Result(code=ResultCode.OK, message="OK", result=[])

            stmt = (
                select(PlaylistRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == PlaylistRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.PLAYLIST.value,
                    ),
                )
                .where(PlaylistRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            playlists: list[PlaylistRow] = list(result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=playlists)

        except Exception as e:
            logger.error(f"Failed to get playlists by spotify ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get playlists by spotify ids: {e}",
            )

    # ── Bulk public_id → spotify_id resolvers ────────────────────────────────

    @staticmethod
    @time_it
    async def get_tracks_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[dict[str, str]]:
        try:
            if not public_ids:
                return Result(code=ResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, TrackRow.spotify_id)
                .join(TrackRow, TrackRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                )
            )
            result = await session.execute(stmt)
            mapping: dict[str, str] = {row.public_id: row.spotify_id for row in result.all()}
            return Result(code=ResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve track public_ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve track public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[dict[str, str]]:
        try:
            if not public_ids:
                return Result(code=ResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, ArtistRow.spotify_id)
                .join(ArtistRow, ArtistRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.ARTIST.value,
                )
            )
            result = await session.execute(stmt)
            mapping: dict[str, str] = {row.public_id: row.spotify_id for row in result.all()}
            return Result(code=ResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve artist public_ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve artist public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlists_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[dict[str, str]]:
        try:
            if not public_ids:
                return Result(code=ResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, PlaylistRow.spotify_id)
                .join(PlaylistRow, PlaylistRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.PLAYLIST.value,
                )
            )
            result = await session.execute(stmt)
            mapping: dict[str, str] = {row.public_id: row.spotify_id for row in result.all()}
            return Result(code=ResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve playlist public_ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve playlist public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_albums_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[dict[str, str]]:
        try:
            if not public_ids:
                return Result(code=ResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, AlbumRow.spotify_id)
                .join(AlbumRow, AlbumRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                )
            )
            result = await session.execute(stmt)
            mapping: dict[str, str] = {row.public_id: row.spotify_id for row in result.all()}
            return Result(code=ResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve album public_ids: {e}")
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve album public_ids: {e}",
            )
