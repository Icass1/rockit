import os
import uuid
import requests as req
from datetime import datetime, timezone
from typing import Dict, List, Tuple, cast

from sqlalchemy.future import select
from sqlalchemy import Result, Select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

# UTILS
from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

# CORE ORM MODELS
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.song import CoreSongRow
from backend.core.access.db.ormModels.album import CoreAlbumRow
from backend.core.access.db.ormModels.artist import CoreArtistRow
from backend.core.access.db.ormModels.playlist import CorePlaylistRow

# SPOTIFY ENUMS
from backend.spotify.enums.copyrightTypeEnum import CopyrightTypeEnum

# SPOTIFY ORM MODELS
from backend.spotify.access.db.ormModels.album import AlbumRow
from backend.spotify.access.db.ormModels.track import TrackRow
from backend.spotify.access.db.ormModels.genre import GenreRow
from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.copyright import CopyrightRow
from backend.spotify.access.db.ormModels.playlist import PlaylistRow
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow
from backend.spotify.access.db.ormModels.playlist_tracks import PlaylistTrackRow

# SPOTIFY ASSOCIATION TABLES
from backend.spotify.access.db.associationTables.album_artists import album_artists
from backend.spotify.access.db.associationTables.artist_genres import artist_genres
from backend.spotify.access.db.associationTables.album_external_images import (
    album_external_images,
)
from backend.spotify.access.db.associationTables.artist_external_images import (
    artist_external_images,
)
from backend.spotify.access.db.associationTables.song_artists import song_artists
from backend.spotify.access.db.associationTables.album_copyrights import (
    album_copyrights,
)

# SPOTIFY TYPES
from backend.spotify.spotifyApiTypes.rawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotify.spotifyApiTypes.rawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotify.spotifyApiTypes.rawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotify.spotifyApiTypes.rawSpotifyApiPlaylist import RawSpotifyApiPlaylist


from backend.constants import IMAGES_PATH

logger = getLogger(__name__)


class SpotifyAccess:
    @staticmethod
    async def get_album_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> AResult[AlbumRow]:
        try:
            stmt: Select[Tuple[AlbumRow]] = (
                select(AlbumRow)
                .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                .where(AlbumRow.spotify_id == spotify_id)
            )
            result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error("Album not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            # Detach from session BEFORE closing session.
            session.expunge(instance=album)
            return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Failed to get album from id {spotify_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album from id {spotify_id}: {e}",
            )

    @staticmethod
    async def get_album_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[AlbumRow]:
        try:
            stmt: Select[Tuple[AlbumRow]] = select(AlbumRow).where(AlbumRow.id == id)
            result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error("Album not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            # Detach from session BEFORE closing session.
            session.expunge(instance=album)
            return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Failed to get album from id {id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album from id {id}: {e}",
            )

    @staticmethod
    async def get_album_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[AlbumRow]] = (
                select(AlbumRow)
                .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                .where(CoreAlbumRow.public_id == public_id)
            )
            result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error("Album not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            return AResult(code=AResultCode.OK, message="OK", result=album.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_track_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[TrackRow]] = (
                select(TrackRow)
                .join(CoreSongRow, CoreSongRow.id == TrackRow.id)
                .where(CoreSongRow.public_id == public_id)
            )
            result: Result[Tuple[TrackRow]] = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error("Track not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

            return AResult(code=AResultCode.OK, message="OK", result=track.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_artist_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[ArtistRow]] = (
                select(ArtistRow)
                .join(CoreArtistRow, CoreArtistRow.id == ArtistRow.id)
                .where(CoreArtistRow.public_id == public_id)
            )
            result: Result[Tuple[ArtistRow]] = await session.execute(stmt)
            artist: ArtistRow | None = result.scalar_one_or_none()

            if not artist:
                logger.error("Artist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

            return AResult(code=AResultCode.OK, message="OK", result=artist.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_playlist_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[PlaylistRow]] = (
                select(PlaylistRow)
                .join(CorePlaylistRow, CorePlaylistRow.id == PlaylistRow.id)
                .where(CorePlaylistRow.public_id == public_id)
            )
            result: Result[Tuple[PlaylistRow]] = await session.execute(stmt)
            artist: PlaylistRow | None = result.scalar_one_or_none()

            if not artist:
                logger.error("Playlist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

            return AResult(code=AResultCode.OK, message="OK", result=artist.spotify_id)

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_track_spotify_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> AResult[TrackRow]:
        try:
            stmt = (
                select(TrackRow)
                .where(TrackRow.spotify_id == spotify_id)
                .options(selectinload(TrackRow.album))
            )
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error("Track not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

            session.expunge(instance=track)

            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track from id {id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track from id {id}: {e}",
            )

    @staticmethod
    async def get_track_id_async(
        session: AsyncSession,
        id: int,
    ) -> AResult[TrackRow]:
        try:
            stmt = select(TrackRow).where(TrackRow.id == id)
            result = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error("Track not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

            session.expunge(instance=track)
            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track from id {id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track from id {id}: {e}",
            )

    @staticmethod
    async def get_artist_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> AResult[ArtistRow]:
        try:
            stmt = select(ArtistRow).where(ArtistRow.spotify_id == spotify_id)
            result = await session.execute(stmt)
            artist: ArtistRow | None = result.scalar_one_or_none()

            if not artist:
                logger.error("Artist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

            session.expunge(instance=artist)
            return AResult(code=AResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Failed to get artist from spotify_id {spotify_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist from spotify_id {spotify_id}: {e}",
            )

    @staticmethod
    async def get_playlist_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> AResult[PlaylistRow]:
        try:
            stmt = select(PlaylistRow).where(PlaylistRow.spotify_id == spotify_id)
            result = await session.execute(stmt)
            playlist: PlaylistRow | None = result.scalar_one_or_none()

            if not playlist:
                logger.error("Playlist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

            session.expunge(instance=playlist)
            return AResult(code=AResultCode.OK, message="OK", result=playlist)

        except Exception as e:
            logger.error(f"Failed to get playlist from id {id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist from id {id}: {e}",
            )

    # ── Image helpers ────────────────────────────────────────────────────────

    @staticmethod
    async def _download_and_create_internal_image(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                return AResult(
                    code=AResultCode.GENERAL_ERROR, message="Image download failed"
                )
            filename = str(uuid.uuid4()) + ".jpg"
            full_path = os.path.join(IMAGES_PATH, filename)
            with open(full_path, "wb") as f:
                f.write(response.content)
            img = ImageRow(public_id=create_id(32), url=url, path=filename)
            session.add(img)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=img)
        except Exception as e:
            logger.error(f"Failed to download/create internal image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create internal image: {e}",
            )

    @staticmethod
    async def _get_or_create_external_image(
        session: AsyncSession,
        url: str,
        width: int | None,
        height: int | None,
    ) -> AResult[ExternalImageRow]:
        try:
            stmt = select(ExternalImageRow).where(ExternalImageRow.url == url)
            result = await session.execute(stmt)
            row: ExternalImageRow | None = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            row = ExternalImageRow(
                public_id=str(uuid.uuid4()), url=url, width=width, height=height
            )
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except IntegrityError:
            logger.warning(
                f"IntegrityError in _get_or_create_external_image for {url}, rolling back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(ExternalImageRow).where(ExternalImageRow.url == url)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            logger.error(
                f"External image {url} not found after IntegrityError rollback"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Failed to get or create external image after conflict",
            )
        except Exception as e:
            logger.error(f"Failed to get/create external image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create external image: {e}",
            )

    @staticmethod
    async def _get_or_create_genre(
        session: AsyncSession,
        name: str,
    ) -> AResult[GenreRow]:
        try:
            stmt = select(GenreRow).where(GenreRow.name == name)
            result = await session.execute(stmt)
            row: GenreRow | None = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            row = GenreRow(name=name)
            session.add(row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=row)
        except IntegrityError:
            logger.warning(
                f"IntegrityError in _get_or_create_genre for {name}, rolling back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(GenreRow).where(GenreRow.name == name)
            result = await session.execute(stmt)
            row = result.scalar_one_or_none()
            if row:
                return AResult(code=AResultCode.OK, message="OK", result=row)
            logger.error(f"Genre {name} not found after IntegrityError rollback")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Failed to get or create genre after conflict",
            )
        except Exception as e:
            logger.error(f"Failed to get/create genre: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create genre: {e}",
            )

    # ── Entity population helpers ─────────────────────────────────────────────

    @staticmethod
    async def get_or_create_artist(
        session: AsyncSession,
        raw: RawSpotifyApiArtist,
        provider_id: int,
    ) -> AResult[ArtistRow]:
        try:
            stmt = (
                select(ArtistRow)
                .join(CoreArtistRow, CoreArtistRow.id == ArtistRow.id)
                .where(CoreArtistRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: ArtistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            # Download highest-res image
            internal_image_id: int | None = None
            if raw.images:
                a_img = await SpotifyAccess._download_and_create_internal_image(
                    session, raw.images[0].url
                )
                if a_img.is_ok():
                    internal_image_id = a_img.result().id

            core_artist = CoreArtistRow(
                public_id=create_id(32), provider_id=provider_id
            )
            session.add(core_artist)
            await session.flush()

            followers = (
                raw.followers.total
                if raw.followers and raw.followers.total is not None
                else 0
            )
            popularity = raw.popularity if raw.popularity is not None else 0

            artist_row = ArtistRow(
                id=core_artist.id,
                spotify_id=raw.id,
                name=raw.name or "",
                followers=followers,
                popularity=popularity,
                internal_image_id=internal_image_id,
            )
            session.add(artist_row)
            await session.flush()

            # Link genres
            if raw.genres:
                for genre_name in raw.genres:
                    a_genre = await SpotifyAccess._get_or_create_genre(
                        session, genre_name
                    )
                    if a_genre.is_ok():
                        artist_row.genres.add(a_genre.result())

            # Link external images
            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyAccess._get_or_create_external_image(
                            session, img.url, img.width, img.height
                        )
                        if a_ext.is_ok():
                            artist_row.external_images.add(a_ext.result())

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=artist_row)

        except IntegrityError:
            logger.warning(
                f"IntegrityError in get_or_create_artist for {raw.id}, rolling back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = (
                select(ArtistRow)
                .join(CoreArtistRow, CoreArtistRow.id == ArtistRow.id)
                .where(CoreArtistRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            logger.error(f"Artist {raw.id} not found after IntegrityError rollback")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get or create artist after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create artist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create artist: {e}",
            )

    @staticmethod
    async def get_or_create_album(
        session: AsyncSession,
        raw: RawSpotifyApiAlbum,
        artist_map: Dict[str, ArtistRow],
        provider_id: int,
    ) -> AResult[AlbumRow]:
        try:
            stmt = (
                select(AlbumRow)
                .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                .where(CoreAlbumRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: AlbumRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            # disc_count
            disc_count = 1
            if raw.tracks and raw.tracks.items:
                disc_count = max((item.disc_number or 1) for item in raw.tracks.items)

            # Download highest-res image
            internal_image_id: int | None = None
            if raw.images:
                a_img: AResult[ImageRow] = (
                    await SpotifyAccess._download_and_create_internal_image(
                        session, raw.images[0].url
                    )
                )
                if a_img.is_ok():
                    internal_image_id = a_img.result().id

            if internal_image_id is None:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Failed to create internal image for album",
                )

            core_album = CoreAlbumRow(public_id=create_id(32), provider_id=provider_id)
            session.add(core_album)
            await session.flush()

            album_row = AlbumRow(
                id=core_album.id,
                spotify_id=raw.id,
                internal_image_id=internal_image_id,
                name=raw.name or "",
                release_date=raw.release_date or "",
                popularity=raw.popularity,
                disc_count=disc_count,
            )
            session.add(album_row)
            await session.flush()

            # Link artists
            if raw.artists:
                for a in raw.artists:
                    if a.id and a.id in artist_map:
                        album_row.artists.add(artist_map[a.id])

            # Link copyrights
            if raw.copyrights:
                for c in raw.copyrights:
                    if c.type and c.type in CopyrightTypeEnum.__members__:
                        type_key = CopyrightTypeEnum[c.type].value
                        cr = CopyrightRow(text=c.text or "", type_key=type_key)
                        session.add(cr)
                        await session.flush()
                        album_row.copyrights.add(cr)

            # Link external images
            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyAccess._get_or_create_external_image(
                            session, img.url, img.width, img.height
                        )
                        if a_ext.is_ok():
                            album_row.external_images.add(a_ext.result())

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=album_row)

        except IntegrityError:
            logger.warning(
                f"IntegrityError in get_or_create_album for {raw.id}, rolling back and fetching existing"
            )
            await session.rollback()
            session.expire_all()
            stmt = (
                select(AlbumRow)
                .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                .where(CoreAlbumRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            logger.error(f"Album {raw.id} not found after IntegrityError rollback")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Failed to get or create album after conflict",
            )
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Failed to get or create album after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create album: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create album: {e}",
            )

    @staticmethod
    async def get_or_create_track(
        session: AsyncSession,
        raw: RawSpotifyApiTrack,
        artist_map: Dict[str, ArtistRow],
        album_row: AlbumRow,
        provider_id: int,
    ) -> AResult[Tuple[TrackRow, CoreSongRow]]:
        try:
            stmt = (
                select(TrackRow)
                .join(CoreSongRow, CoreSongRow.id == TrackRow.id)
                .where(CoreSongRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: TrackRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            isrc = ""
            if raw.external_ids and raw.external_ids.isrc:
                isrc = raw.external_ids.isrc

            core_song = CoreSongRow(public_id=create_id(32), provider_id=provider_id)
            session.add(core_song)
            await session.flush()

            track_row = TrackRow(
                id=core_song.id,
                spotify_id=raw.id,
                name=raw.name or "",
                duration=(
                    int(raw.duration_ms / 1000) if raw.duration_ms is not None else 0
                ),
                track_number=(raw.track_number if raw.track_number is not None else 0),
                disc_number=raw.disc_number if raw.disc_number is not None else 1,
                internal_image_id=album_row.internal_image_id,
                album_id=album_row.id,
                isrc=isrc,
                popularity=raw.popularity,
                preview_url=raw.preview_url,
            )
            session.add(track_row)
            await session.flush()

            # Link artists
            if raw.artists:
                for a in raw.artists:
                    if a.id and a.id in artist_map:
                        track_row.artists.add(artist_map[a.id])

            await session.flush()
            return AResult(
                code=AResultCode.OK, message="OK", result=(track_row, core_song)
            )

        except Exception as e:
            logger.error(f"Failed to get/create track: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create track: {e}",
            )

    @staticmethod
    async def get_or_create_playlist(
        session: AsyncSession,
        raw: RawSpotifyApiPlaylist,
        track_row_map: Dict[str, TrackRow],
        provider_id: int,
    ) -> AResult[PlaylistRow]:
        try:
            stmt = (
                select(PlaylistRow)
                .join(CorePlaylistRow, CorePlaylistRow.id == PlaylistRow.id)
                .where(CorePlaylistRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: PlaylistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            # Download image
            internal_image_id: int | None = None
            if raw.images:
                a_img = await SpotifyAccess._download_and_create_internal_image(
                    session, raw.images[0].url
                )
                if a_img.is_ok():
                    internal_image_id = a_img.result().id

            owner = ""
            if raw.owner:
                owner = raw.owner.display_name or raw.owner.id or ""

            core_playlist = CorePlaylistRow(
                public_id=create_id(32), provider_id=provider_id
            )
            session.add(core_playlist)
            await session.flush()

            playlist_row = PlaylistRow(
                id=core_playlist.id,
                spotify_id=raw.id,
                name=raw.name or "",
                owner=owner,
                internal_image_id=internal_image_id,
                followers=0,
                description=raw.description,
            )
            session.add(playlist_row)
            await session.flush()

            # Link external images
            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = await SpotifyAccess._get_or_create_external_image(
                            session, img.url, img.width, img.height
                        )
                        if a_ext.is_ok():
                            playlist_row.external_images.add(a_ext.result())

            # Create PlaylistTrackRow links
            if raw.tracks and raw.tracks.items:
                for item in raw.tracks.items:
                    if not item.track or not item.track.id:
                        continue
                    track_row = track_row_map.get(item.track.id)
                    if not track_row:
                        continue
                    added_at = datetime.now(timezone.utc)
                    if item.added_at:
                        try:
                            added_at = datetime.fromisoformat(
                                item.added_at.replace("Z", "+00:00")
                            )
                        except Exception:
                            pass
                    added_by = item.added_by.id if item.added_by else None
                    pt = PlaylistTrackRow(
                        playlist_id=playlist_row.id,
                        song_id=track_row.id,
                        added_at=added_at,
                        disabled=False,
                        added_by=added_by,
                    )
                    session.add(pt)

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=playlist_row)

        except Exception as e:
            logger.error(f"Failed to get/create playlist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create playlist: {e}",
            )

    @staticmethod
    async def get_artists_from_track_row_async(
        session: AsyncSession,
        track_row: TrackRow,
    ) -> AResult[List[ArtistRow]]:
        try:
            stmt: Select[Tuple[List[ArtistRow]]] = track_row.artists.select()
            result: Result[Tuple[List[ArtistRow]]] = await session.execute(stmt)
            artists: List[ArtistRow] = cast(List[ArtistRow], result.scalars().all())

            if not artists:
                logger.error("Error getting artists from track row.")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Error getting artists from track row.",
                )

            for artist in artists:
                session.expunge(artist)

            return AResult(code=AResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists from track row: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from track row: {e}",
            )

    @staticmethod
    async def get_artists_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[ArtistRow]]:
        try:
            stmt = (
                select(ArtistRow)
                .join(album_artists)
                .join(AlbumRow)
                .filter(AlbumRow.id == album_id)
            )
            result: Result[Tuple[ArtistRow]] = await session.execute(stmt)
            artists_list: List[ArtistRow] = cast(
                List[ArtistRow], result.scalars().all()
            )

            if not artists_list:
                logger.error(f"No artists found for album id {album_id}")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="No artists found for this album.",
                )

            # Detach from session
            for artist in artists_list:
                session.expunge(artist)

            return AResult(code=AResultCode.OK, message="OK", result=artists_list)

        except Exception as e:
            logger.error(f"Failed to get artists from album id {album_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from album id {album_id}: {e}",
            )

    @staticmethod
    async def get_tracks_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[TrackRow]]:
        try:
            stmt = select(TrackRow).where(TrackRow.album_id == album_id)
            result: Result[Tuple[TrackRow]] = await session.execute(stmt)
            tracks_list: List[TrackRow] = cast(List[TrackRow], result.scalars().all())

            if not tracks_list:
                logger.error(f"No tracks found for album id {album_id}")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="No tracks found for this album.",
                )

            # Detach from session
            for track in tracks_list:
                session.expunge(track)

            return AResult(code=AResultCode.OK, message="OK", result=tracks_list)

        except Exception as e:
            logger.error(f"Failed to get tracks from album id {album_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks from album id {album_id}: {e}",
            )

    @staticmethod
    async def get_external_images_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[ExternalImageRow]]:
        try:
            stmt = (
                select(ExternalImageRow)
                .join(album_external_images)
                .join(AlbumRow)
                .filter(AlbumRow.id == album_id)
            )
            result: Result[Tuple[ExternalImageRow]] = await session.execute(stmt)
            images_list: List[ExternalImageRow] = cast(
                List[ExternalImageRow], result.scalars().all()
            )

            # Detach from session
            for image in images_list:
                session.expunge(image)

            return AResult(code=AResultCode.OK, message="OK", result=images_list)

        except Exception as e:
            logger.error(f"Failed to get external images from album id {album_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get external images from album id {album_id}: {e}",
            )

    @staticmethod
    async def get_tracks_with_core_song_from_album_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[Tuple[TrackRow, CoreSongRow]]]:
        try:
            stmt = (
                select(TrackRow, CoreSongRow)
                .join(CoreSongRow, CoreSongRow.id == TrackRow.id)
                .where(TrackRow.album_id == album_id)
            )
            result: Result[Tuple[TrackRow, CoreSongRow]] = await session.execute(stmt)
            tracks_with_core: List[Tuple[TrackRow, CoreSongRow]] = []

            for track_row, core_song_row in result.all():
                session.expunge(track_row)
                session.expunge(core_song_row)
                tracks_with_core.append((track_row, core_song_row))

            return AResult(code=AResultCode.OK, message="OK", result=tracks_with_core)

        except Exception as e:
            logger.error(
                f"Failed to get tracks with core song from album id {album_id}: {e}"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks with core song from album id {album_id}: {e}",
            )

    @staticmethod
    async def get_genres_from_artist_id_async(
        session: AsyncSession,
        artist_id: int,
    ) -> AResult[List[str]]:
        try:
            stmt = (
                select(GenreRow)
                .join(artist_genres)
                .join(ArtistRow)
                .filter(ArtistRow.id == artist_id)
            )
            result: Result[Tuple[GenreRow]] = await session.execute(stmt)
            genres: List[GenreRow] = cast(List[GenreRow], result.scalars().all())

            genre_names: List[str] = [g.name for g in genres]
            return AResult(code=AResultCode.OK, message="OK", result=genre_names)

        except Exception as e:
            logger.error(f"Failed to get genres from artist id {artist_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get genres from artist id {artist_id}: {e}",
            )

    @staticmethod
    async def get_genres_from_artist_async(
        session: AsyncSession,
        artist: ArtistRow,
    ) -> AResult[List[str]]:
        try:
            stmt = (
                select(GenreRow)
                .join(artist_genres)
                .filter(artist_genres.c.artist_id == artist.id)
            )
            result: Result[Tuple[GenreRow]] = await session.execute(stmt)
            genres: List[GenreRow] = cast(List[GenreRow], result.scalars().all())

            genre_names: List[str] = [g.name for g in genres]
            return AResult(code=AResultCode.OK, message="OK", result=genre_names)

        except Exception as e:
            logger.error(f"Failed to get genres from artist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get genres from artist: {e}",
            )

    @staticmethod
    async def get_playlist_track_links_async(
        session: AsyncSession,
        playlist_id: int,
    ) -> AResult[List[Tuple[PlaylistTrackRow, TrackRow]]]:
        try:
            stmt = select(PlaylistTrackRow).where(
                PlaylistTrackRow.playlist_id == playlist_id
            )
            result: Result[Tuple[PlaylistTrackRow]] = await session.execute(stmt)
            playlist_track_rows: List[PlaylistTrackRow] = cast(
                List[PlaylistTrackRow], result.scalars().all()
            )

            track_links: List[Tuple[PlaylistTrackRow, TrackRow]] = []
            for ptr in playlist_track_rows:
                track_stmt = select(TrackRow).where(TrackRow.id == ptr.song_id)
                track_result = await session.execute(track_stmt)
                track_row: TrackRow | None = track_result.scalar_one_or_none()
                if track_row:
                    track_links.append((ptr, track_row))

            return AResult(code=AResultCode.OK, message="OK", result=track_links)

        except Exception as e:
            logger.error(f"Failed to get playlist track links: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist track links: {e}",
            )

    # ── Bulk getters ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_albums_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[AlbumRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            stmt = (
                select(AlbumRow)
                .join(CoreAlbumRow, CoreAlbumRow.id == AlbumRow.id)
                .where(AlbumRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            albums: List[AlbumRow] = list(result.scalars().all())

            for album in albums:
                session.expunge(album)

            return AResult(code=AResultCode.OK, message="OK", result=albums)

        except Exception as e:
            logger.error(f"Failed to get albums by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get albums by spotify ids: {e}",
            )

    @staticmethod
    async def get_tracks_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[TrackRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            stmt = (
                select(TrackRow)
                .join(CoreSongRow, CoreSongRow.id == TrackRow.id)
                .where(TrackRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            tracks: List[TrackRow] = list(result.scalars().all())

            for track in tracks:
                session.expunge(track)

            return AResult(code=AResultCode.OK, message="OK", result=tracks)

        except Exception as e:
            logger.error(f"Failed to get tracks by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks by spotify ids: {e}",
            )

    @staticmethod
    async def get_artists_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[ArtistRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            stmt = (
                select(ArtistRow)
                .join(CoreArtistRow, CoreArtistRow.id == ArtistRow.id)
                .where(ArtistRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            artists: List[ArtistRow] = list(result.scalars().all())

            for artist in artists:
                session.expunge(artist)

            return AResult(code=AResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists by spotify ids: {e}",
            )

    @staticmethod
    async def get_playlists_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[PlaylistRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

            stmt = (
                select(PlaylistRow)
                .join(CorePlaylistRow, CorePlaylistRow.id == PlaylistRow.id)
                .where(PlaylistRow.spotify_id.in_(spotify_ids))
            )
            result = await session.execute(stmt)
            playlists: List[PlaylistRow] = list(result.scalars().all())

            for playlist in playlists:
                session.expunge(playlist)

            return AResult(code=AResultCode.OK, message="OK", result=playlists)

        except Exception as e:
            logger.error(f"Failed to get playlists by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlists by spotify ids: {e}",
            )

    # ── Image download helpers ────────────────────────────────────────────────

    @staticmethod
    async def download_and_create_album_image_async(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                logger.warning(f"Failed to download album image from {url}")
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Image download failed",
                )

            spotify_dir = os.path.join(IMAGES_PATH, "spotify", "album")
            os.makedirs(spotify_dir, exist_ok=True)

            filename = str(uuid.uuid4()) + ".jpg"
            full_path = os.path.join(spotify_dir, filename)
            with open(full_path, "wb") as f:
                f.write(response.content)

            img = ImageRow(public_id=create_id(32), url=url, path=filename)
            session.add(img)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=img)

        except Exception as e:
            logger.error(f"Failed to download/create album image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create album image: {e}",
            )

    @staticmethod
    async def download_and_create_artist_image_async(
        session: AsyncSession,
        url: str,
    ) -> AResult[ImageRow]:
        try:
            response = req.get(url, timeout=10)
            if response.status_code != 200:
                logger.warning(f"Failed to download artist image from {url}")
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Image download failed",
                )

            spotify_dir = os.path.join(IMAGES_PATH, "spotify", "artist")
            os.makedirs(spotify_dir, exist_ok=True)

            filename = str(uuid.uuid4()) + ".jpg"
            full_path = os.path.join(spotify_dir, filename)
            with open(full_path, "wb") as f:
                f.write(response.content)

            img = ImageRow(public_id=create_id(32), url=url, path=filename)
            session.add(img)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=img)

        except Exception as e:
            logger.error(f"Failed to download/create artist image: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to download/create artist image: {e}",
            )

    # ── Association helpers ──────────────────────────────────────────────────

    @staticmethod
    async def link_album_external_image_async(
        session: AsyncSession,
        album_id: int,
        external_image_id: int,
    ) -> AResult[None]:
        try:
            stmt = album_external_images.insert().values(
                album_id=album_id,
                external_image_id=external_image_id,
            )
            await session.execute(stmt)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.warning(
                f"Failed to link album external image (may already exist): {e}"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to link album external image: {e}",
            )

    @staticmethod
    async def link_artist_external_image_async(
        session: AsyncSession,
        artist_id: int,
        external_image_id: int,
    ) -> AResult[None]:
        try:
            stmt = artist_external_images.insert().values(
                artist_id=artist_id,
                external_image_id=external_image_id,
            )
            await session.execute(stmt)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.warning(
                f"Failed to link artist external image (may already exist): {e}"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to link artist external image: {e}",
            )

    @staticmethod
    async def link_track_artists_async(
        session: AsyncSession,
        track_id: int,
        artist_ids: List[int],
    ) -> AResult[None]:
        try:
            for artist_id in artist_ids:
                stmt = song_artists.insert().values(
                    track_id=track_id,
                    artist_id=artist_id,
                )
                await session.execute(stmt)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.warning(f"Failed to link track artists (may already exist): {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to link track artists: {e}",
            )

    @staticmethod
    async def link_album_artists_async(
        session: AsyncSession,
        album_id: int,
        artist_ids: List[int],
    ) -> AResult[None]:
        try:
            for artist_id in artist_ids:
                stmt = album_artists.insert().values(
                    album_id=album_id,
                    artist_id=artist_id,
                )
                await session.execute(stmt)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.warning(f"Failed to link album artists (may already exist): {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to link album artists: {e}",
            )

    @staticmethod
    async def link_artist_genres_async(
        session: AsyncSession,
        artist_id: int,
        genre_ids: List[int],
    ) -> AResult[None]:
        try:
            for genre_id in genre_ids:
                stmt = artist_genres.insert().values(
                    artist_id=artist_id,
                    genre_id=genre_id,
                )
                await session.execute(stmt)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.warning(f"Failed to link artist genres (may already exist): {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to link artist genres: {e}",
            )

    @staticmethod
    async def link_album_copyrights_async(
        session: AsyncSession,
        album_id: int,
        copyright_ids: List[int],
    ) -> AResult[None]:
        try:
            for copyright_id in copyright_ids:
                stmt = album_copyrights.insert().values(
                    album_id=album_id,
                    copyright_id=copyright_id,
                )
                await session.execute(stmt)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.warning(f"Failed to link album copyrights (may already exist): {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to link album copyrights: {e}",
            )
