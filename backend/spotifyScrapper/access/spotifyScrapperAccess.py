import os
import uuid
from datetime import datetime, timezone

import requests as req
from typing import Dict, List, Tuple, cast

from sqlalchemy.future import select
from sqlalchemy import Result, Select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from backend.utils.backendUtils import create_id, time_it
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media.image import Image

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.spotifyScrapper.enums.copyrightTypeEnum import CopyrightTypeEnum

from backend.spotifyScrapper.access.db.ormModels.album import AlbumRow
from backend.spotifyScrapper.access.db.ormModels.track import TrackRow
from backend.spotifyScrapper.access.db.ormModels.genre import GenreRow
from backend.spotifyScrapper.access.db.ormModels.artist import ArtistRow
from backend.spotifyScrapper.access.db.ormModels.copyright import CopyrightRow
from backend.spotifyScrapper.access.db.ormModels.playlist import PlaylistRow
from backend.spotifyScrapper.access.db.ormModels.externalImage import ExternalImageRow
from backend.spotifyScrapper.access.db.ormModels.playlist_tracks import (
    PlaylistTrackRow,
)

from backend.spotifyScrapper.access.db.associationTables.album_artists import (
    album_artists,
)
from backend.spotifyScrapper.access.db.associationTables.artist_genres import (
    artist_genres,
)
from backend.spotifyScrapper.access.db.associationTables.album_external_images import (
    album_external_images,
)


from backend.spotifyScrapper.framework.spotifyScrapperApi import (
    ScrappedAlbum,
    ScrappedTrack,
    ScrappedArtist,
    ScrappedPlaylist,
)

from backend.spotifyScrapper.framework.models.playlistTrackLink import (
    PlaylistTrackLink,
)
from backend.spotifyScrapper.framework.models.trackWithCoreMedia import (
    TrackWithCoreMedia,
)

from backend.constants import IMAGES_PATH

logger = getLogger(__name__)


class SpotifyScrapperAccess:
    @staticmethod
    @time_it
    async def get_album_public_id_async(
        session: AsyncSession,
        spotify_id: str,
    ) -> AResult[AlbumRow]:
        try:
            stmt: Select[Tuple[AlbumRow]] = (
                select(AlbumRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(AlbumRow.spotify_id == spotify_id)
            )
            result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error("Album not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Failed to get album from id {spotify_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album from id {spotify_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_album_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[AlbumRow]] = (
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
    @time_it
    async def get_track_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[TrackRow]] = (
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
    @time_it
    async def get_artist_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[ArtistRow]] = (
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
    @time_it
    async def get_playlist_spotify_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
        try:
            stmt: Select[Tuple[PlaylistRow]] = (
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
            result: Result[Tuple[PlaylistRow]] = await session.execute(stmt)
            playlist: PlaylistRow | None = result.scalar_one_or_none()

            if not playlist:
                logger.error("Playlist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

            return AResult(
                code=AResultCode.OK, message="OK", result=playlist.spotify_id
            )

        except Exception as e:
            logger.error(f"Failed to get spotify_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get spotify_id from public_id {public_id}: {e}",
            )

    @staticmethod
    @time_it
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
                logger.warning(f"Track not found for spotify_id: {spotify_id}")
                return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track from spotify_id {spotify_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track from spotify_id {spotify_id}: {e}",
            )

    @staticmethod
    @time_it
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

            return AResult(code=AResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Failed to get artist from spotify_id {spotify_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist from spotify_id {spotify_id}: {e}",
            )

    @staticmethod
    @time_it
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

            return AResult(code=AResultCode.OK, message="OK", result=playlist)

        except Exception as e:
            logger.error(f"Failed to get playlist from id {spotify_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist from id {spotify_id}: {e}",
            )

    # ── Image helpers ────────────────────────────────────────────────────────

    @staticmethod
    @time_it
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
    @time_it
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
                public_id=create_id(32), url=url, width=width, height=height
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
    @time_it
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
    @time_it
    async def get_or_create_artist(
        session: AsyncSession,
        raw: ScrappedArtist,
        provider_id: int,
    ) -> AResult[ArtistRow]:
        try:
            stmt = (
                select(ArtistRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == ArtistRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ARTIST.value,
                    ),
                )
                .where(CoreMediaRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: ArtistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            image_id: int | None = None
            if raw.images:
                a_img = await SpotifyScrapperAccess._download_and_create_internal_image(
                    session, raw.images[0].url
                )
                if a_img.is_ok():
                    image_id = a_img.result().id

            if image_id is None:
                a_result_image: AResult[ImageRow] = (
                    await Image.get_image_from_path_async(
                        session=session, path="album-placeholder.png"
                    )
                )
                if a_result_image.is_ok():
                    image_id = a_result_image.result().id
                else:
                    logger.error(
                        f"Error getting placeholder image: {a_result_image.info()}"
                    )
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
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
                    a_genre = await SpotifyScrapperAccess._get_or_create_genre(
                        session, genre_name
                    )
                    if a_genre.is_ok():
                        artist_row.genres.add(a_genre.result())  # type: ignore[arg-type]

            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = (
                            await SpotifyScrapperAccess._get_or_create_external_image(
                                session, img.url, img.width, img.height
                            )
                        )
                        if a_ext.is_ok():
                            artist_row.external_images.add(a_ext.result())  # type: ignore[arg-type]

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=artist_row)

        except IntegrityError as e:
            logger.warning(
                f"IntegrityError in get_or_create_artist for {raw.id}, rolling back and fetching existing. Error: {e}"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(ArtistRow).where(ArtistRow.spotify_id == raw.id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            logger.error(f"Artist {raw.id} not found after IntegrityError rollback")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Failed to get or create artist after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create artist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create artist: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_album(
        session: AsyncSession,
        raw: ScrappedAlbum,
        artist_map: Dict[str, ArtistRow],
        provider_id: int,
    ) -> AResult[AlbumRow]:
        try:
            stmt = (
                select(AlbumRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(CoreMediaRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: AlbumRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            disc_count = (
                max((t.disc_number or 1) for t in raw.tracks) if raw.tracks else 1
            )

            image_id: int | None = None
            if raw.images:
                a_img: AResult[ImageRow] = (
                    await SpotifyScrapperAccess._download_and_create_internal_image(
                        session, raw.images[0].url
                    )
                )
                if a_img.is_ok():
                    image_id = a_img.result().id

            if image_id is None:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
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
                        album_row.artists.append(artist_map[a.id])

            if raw.copyrights:
                for c in raw.copyrights:
                    if c.get("type") and c["type"] in CopyrightTypeEnum.__members__:
                        type_key = CopyrightTypeEnum[c["type"]].value
                        cr = CopyrightRow(
                            text=c.get("text", "") or "", type_key=type_key
                        )
                        session.add(cr)
                        await session.flush()
                        album_row.copyrights.add(cr)  # type: ignore[arg-type]

            if raw.images:
                for img in raw.images:
                    if img.url:
                        a_ext = (
                            await SpotifyScrapperAccess._get_or_create_external_image(
                                session, img.url, img.width, img.height
                            )
                        )
                        if a_ext.is_ok():
                            album_row.external_images.add(a_ext.result())  # type: ignore[arg-type]

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
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == AlbumRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                    ),
                )
                .where(CoreMediaRow.public_id == raw.id)
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

        except Exception as e:
            logger.error(f"Failed to get/create album: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create album: {e}",
            )

    @staticmethod
    @time_it
    async def get_or_create_track(
        session: AsyncSession,
        raw: ScrappedTrack,
        artist_map: Dict[str, ArtistRow],
        album_row: AlbumRow,
        provider_id: int,
    ) -> AResult[Tuple[TrackRow, CoreMediaRow]]:
        try:
            stmt = (
                select(TrackRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == TrackRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                    ),
                )
                .where(CoreMediaRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: TrackRow | None = result.scalar_one_or_none()
            if existing:
                existing_core = await session.get(CoreMediaRow, existing.id)
                if existing_core is None:
                    return AResult(
                        code=AResultCode.GENERAL_ERROR,
                        message="CoreMediaRow not found for existing track",
                    )
                return AResult(
                    code=AResultCode.OK, message="OK", result=(existing, existing_core)
                )

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
                isrc=raw.isrc,
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
    @time_it
    async def get_or_create_playlist(
        session: AsyncSession,
        raw: ScrappedPlaylist,
        track_row_map: Dict[str, TrackRow],
        provider_id: int,
    ) -> AResult[PlaylistRow]:
        try:
            stmt = (
                select(PlaylistRow)
                .join(
                    CoreMediaRow,
                    and_(
                        CoreMediaRow.id == PlaylistRow.id,
                        CoreMediaRow.media_type_key == MediaTypeEnum.PLAYLIST.value,
                    ),
                )
                .where(CoreMediaRow.public_id == raw.id)
            )
            result = await session.execute(stmt)
            existing: PlaylistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            image_id: int | None = None
            if raw.images:
                a_img = await SpotifyScrapperAccess._download_and_create_internal_image(
                    session, raw.images[0].url
                )
                if a_img.is_ok():
                    image_id = a_img.result().id

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
                        a_ext = (
                            await SpotifyScrapperAccess._get_or_create_external_image(
                                session, img.url, img.width, img.height
                            )
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
                    added_at = datetime.now(timezone.utc)
                    if item.added_at:
                        try:
                            added_at = datetime.fromisoformat(
                                item.added_at.replace("Z", "+00:00")
                            )
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
            return AResult(code=AResultCode.OK, message="OK", result=playlist_row)

        except Exception as e:
            logger.error(f"Failed to get/create playlist: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create playlist: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_from_track_row_async(
        session: AsyncSession,
        track_row: TrackRow,
    ) -> AResult[List[ArtistRow]]:
        try:
            stmt: Select[Tuple[List[ArtistRow]]] = track_row.artists.select()
            result: Result[Tuple[List[ArtistRow]]] = await session.execute(stmt)
            artists: List[ArtistRow] = cast(List[ArtistRow], result.scalars().all())

            if not artists:
                logger.error(f"Error getting artists from track row {track_row.id}.")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Error getting artists from track row. {track_row.id}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists from track row: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from track row: {e}",
            )

    @staticmethod
    @time_it
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

            return AResult(code=AResultCode.OK, message="OK", result=artists_list)

        except Exception as e:
            logger.error(f"Failed to get artists from album id {album_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
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

            return AResult(code=AResultCode.OK, message="OK", result=tracks_list)

        except Exception as e:
            logger.error(f"Failed to get tracks from album id {album_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
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

            return AResult(code=AResultCode.OK, message="OK", result=images_list)

        except Exception as e:
            logger.error(f"Failed to get external images from album id {album_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get external images from album id {album_id}: {e}",
            )

    @staticmethod
    @time_it
    async def get_tracks_with_core_song_from_album_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[TrackWithCoreMedia]]:
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
            result: Result[Tuple[TrackRow, CoreMediaRow]] = await session.execute(stmt)
            tracks_with_core: List[TrackWithCoreMedia] = []

            for track_row, core_song_row in result.all():
                tracks_with_core.append(
                    TrackWithCoreMedia(track=track_row, core_media=core_song_row)
                )

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
    @time_it
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
    @time_it
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
    @time_it
    async def get_playlist_track_links_async(
        session: AsyncSession,
        playlist_id: int,
    ) -> AResult[List[PlaylistTrackLink]]:
        try:
            stmt: Select[Tuple[PlaylistTrackRow]] = select(PlaylistTrackRow).where(
                PlaylistTrackRow.playlist_id == playlist_id
            )
            result: Result[Tuple[PlaylistTrackRow]] = await session.execute(stmt)
            playlist_track_rows: List[PlaylistTrackRow] = cast(
                List[PlaylistTrackRow], result.scalars().all()
            )

            track_links: List[PlaylistTrackLink] = []
            for ptr in playlist_track_rows:
                track_stmt = (
                    select(TrackRow)
                    .where(TrackRow.id == ptr.song_id)
                    .options(selectinload(TrackRow.album))
                )
                track_result: Result[Tuple[TrackRow]] = await session.execute(
                    track_stmt
                )
                track_row: TrackRow | None = track_result.scalar_one_or_none()
                if track_row:
                    track_links.append(
                        PlaylistTrackLink(playlist_track=ptr, track=track_row)
                    )

            return AResult(code=AResultCode.OK, message="OK", result=track_links)

        except Exception as e:
            logger.error(f"Failed to get playlist track links: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist track links: {e}",
            )

    # ── Bulk getters ─────────────────────────────────────────────────────────────

    @staticmethod
    async def get_album_rows_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[AlbumRow]]:
        try:
            if not public_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

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
            albums: List[AlbumRow] = list(result.scalars().all())
            return AResult(code=AResultCode.OK, message="OK", result=albums)

        except Exception as e:
            logger.error(f"Failed to get album rows from public_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album rows from public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_albums_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[AlbumRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

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
            albums: List[AlbumRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=albums)

        except Exception as e:
            logger.error(f"Failed to get albums by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get albums by spotify ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_tracks_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[TrackRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

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
            tracks: List[TrackRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=tracks)

        except Exception as e:
            logger.error(f"Failed to get tracks by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks by spotify ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[ArtistRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

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
            artists: List[ArtistRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists by spotify ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlists_by_spotify_ids_async(
        session: AsyncSession,
        spotify_ids: List[str],
    ) -> AResult[List[PlaylistRow]]:
        try:
            if not spotify_ids:
                return AResult(code=AResultCode.OK, message="OK", result=[])

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
            playlists: List[PlaylistRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=playlists)

        except Exception as e:
            logger.error(f"Failed to get playlists by spotify ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlists by spotify ids: {e}",
            )

    # ── Bulk public_id → spotify_id resolvers ────────────────────────────────

    @staticmethod
    @time_it
    async def get_tracks_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[Dict[str, str]]:
        try:
            if not public_ids:
                return AResult(code=AResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, TrackRow.spotify_id)
                .join(TrackRow, TrackRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                )
            )
            result = await session.execute(stmt)
            mapping: Dict[str, str] = {
                row.public_id: row.spotify_id for row in result.all()
            }
            return AResult(code=AResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve track public_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve track public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_artists_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[Dict[str, str]]:
        try:
            if not public_ids:
                return AResult(code=AResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, ArtistRow.spotify_id)
                .join(ArtistRow, ArtistRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.ARTIST.value,
                )
            )
            result = await session.execute(stmt)
            mapping: Dict[str, str] = {
                row.public_id: row.spotify_id for row in result.all()
            }
            return AResult(code=AResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve artist public_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve artist public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_playlists_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[Dict[str, str]]:
        try:
            if not public_ids:
                return AResult(code=AResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, PlaylistRow.spotify_id)
                .join(PlaylistRow, PlaylistRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.PLAYLIST.value,
                )
            )
            result = await session.execute(stmt)
            mapping: Dict[str, str] = {
                row.public_id: row.spotify_id for row in result.all()
            }
            return AResult(code=AResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve playlist public_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve playlist public_ids: {e}",
            )

    @staticmethod
    @time_it
    async def get_albums_spotify_id_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[Dict[str, str]]:
        try:
            if not public_ids:
                return AResult(code=AResultCode.OK, message="OK", result={})

            stmt = (
                select(CoreMediaRow.public_id, AlbumRow.spotify_id)
                .join(AlbumRow, AlbumRow.id == CoreMediaRow.id)
                .where(
                    CoreMediaRow.public_id.in_(public_ids),
                    CoreMediaRow.media_type_key == MediaTypeEnum.ALBUM.value,
                )
            )
            result = await session.execute(stmt)
            mapping: Dict[str, str] = {
                row.public_id: row.spotify_id for row in result.all()
            }
            return AResult(code=AResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Failed to bulk-resolve album public_ids: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to bulk-resolve album public_ids: {e}",
            )
