import uuid
import os
import requests as req
from typing import Dict, List, Tuple, cast, TYPE_CHECKING

from sqlalchemy.future import select
from sqlalchemy import Result, Select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.framework.media.image import Image

from backend.youtubeMusic.access.db.ormModels.track import TrackRow
from backend.youtubeMusic.access.db.ormModels.album import AlbumRow
from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow
from backend.youtubeMusic.access.db.ormModels.playlist import PlaylistRow
from backend.youtubeMusic.access.db.ormModels.playlist_track import PlaylistTrackRow

from backend.constants import IMAGES_PATH

if TYPE_CHECKING:
    from backend.youtubeMusic.utils.youtubeMusicApi import (
        YoutubeMusicTrack,
        YoutubeMusicAlbum,
        YoutubeMusicArtist,
    )

logger = getLogger(__name__)


class YoutubeMusicAccess:
    @staticmethod
    async def get_track_youtube_id_from_public_id_async(
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

            return AResult(code=AResultCode.OK, message="OK", result=track.youtube_id)

        except Exception as e:
            logger.error(f"Failed to get youtube_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get youtube_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_track_by_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[TrackRow]:
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
                .options(selectinload(TrackRow.album).selectinload(AlbumRow.core_album))
            )
            result: Result[Tuple[TrackRow]] = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error("Track not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

            session.expunge(track)
            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_track_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[TrackRow]:
        try:
            stmt: Select[Tuple[TrackRow]] = (
                select(TrackRow)
                .where(TrackRow.youtube_id == youtube_id)
                .options(selectinload(TrackRow.album).selectinload(AlbumRow.core_album))
            )
            result: Result[Tuple[TrackRow]] = await session.execute(stmt)
            track: TrackRow | None = result.scalar_one_or_none()

            if not track:
                logger.error("Track not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

            return AResult(code=AResultCode.OK, message="OK", result=track)

        except Exception as e:
            logger.error(f"Failed to get track from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get track from youtube_id {youtube_id}: {e}",
            )

    @staticmethod
    async def get_album_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[AlbumRow]:
        try:
            stmt: Select[Tuple[AlbumRow]] = select(AlbumRow).where(
                AlbumRow.youtube_id == youtube_id
            )
            result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
            album: AlbumRow | None = result.scalar_one_or_none()

            if not album:
                logger.error("Album not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Album not found")

            return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Failed to get album from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get album from youtube_id {youtube_id}: {e}",
            )

    @staticmethod
    async def get_artist_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[ArtistRow]:
        try:
            stmt: Select[Tuple[ArtistRow]] = select(ArtistRow).where(
                ArtistRow.youtube_id == youtube_id
            )
            result: Result[Tuple[ArtistRow]] = await session.execute(stmt)
            artist: ArtistRow | None = result.scalar_one_or_none()

            if not artist:
                logger.error("Artist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

            return AResult(code=AResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Failed to get artist from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artist from youtube_id {youtube_id}: {e}",
            )

    @staticmethod
    async def get_album_youtube_id_from_public_id_async(
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

            return AResult(code=AResultCode.OK, message="OK", result=album.youtube_id)

        except Exception as e:
            logger.error(f"Failed to get youtube_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get youtube_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_artist_youtube_id_from_public_id_async(
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

            return AResult(code=AResultCode.OK, message="OK", result=artist.youtube_id)

        except Exception as e:
            logger.error(f"Failed to get youtube_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get youtube_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_tracks_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[TrackRow]]:
        try:
            stmt: Select[Tuple[TrackRow]] = select(TrackRow).where(
                TrackRow.album_id == album_id
            )
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
    async def get_artists_from_track_async(
        session: AsyncSession,
        track: TrackRow,
    ) -> AResult[List[ArtistRow]]:
        try:
            stmt: Select[tuple[ArtistRow]] = select(ArtistRow).where(
                ArtistRow.tracks.any(TrackRow.id == track.id)
            )
            result = await session.execute(stmt)
            artists: List[ArtistRow] = cast(List[ArtistRow], result.scalars().all())

            if not artists:
                logger.error(f"Error getting artists from track row {track.id}.")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"Error getting artists from track row. {track.id}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists from track row: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from track row: {e}",
            )

    @staticmethod
    async def get_artists_from_album_async(
        session: AsyncSession,
        album: AlbumRow,
    ) -> AResult[List[ArtistRow]]:
        try:
            stmt: Select[tuple[ArtistRow]] = select(ArtistRow).where(
                ArtistRow.albums.any(AlbumRow.id == album.id)
            )
            result = await session.execute(stmt)
            artists: List[ArtistRow] = cast(List[ArtistRow], result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=artists)

        except Exception as e:
            logger.error(f"Failed to get artists from album: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get artists from album: {e}",
            )

    @staticmethod
    async def get_tracks_from_artist_id_async(
        session: AsyncSession,
        artist_id: int,
    ) -> AResult[List[TrackRow]]:
        try:
            stmt: Select[Tuple[TrackRow]] = select(TrackRow).where(
                TrackRow.artists.any(ArtistRow.id == artist_id)
            )
            result: Result[Tuple[TrackRow]] = await session.execute(stmt)
            tracks_list: List[TrackRow] = cast(List[TrackRow], result.scalars().all())

            if not tracks_list:
                logger.error(f"No tracks found for artist id {artist_id}")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="No tracks found for this artist.",
                )

            return AResult(code=AResultCode.OK, message="OK", result=tracks_list)

        except Exception as e:
            logger.error(f"Failed to get tracks from artist id {artist_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get tracks from artist id {artist_id}: {e}",
            )

    @staticmethod
    async def get_playlist_youtube_id_from_public_id_async(
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
                code=AResultCode.OK, message="OK", result=playlist.youtube_id
            )

        except Exception as e:
            logger.error(f"Failed to get youtube_id from public_id {public_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get youtube_id from public_id {public_id}: {e}",
            )

    @staticmethod
    async def get_playlist_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[PlaylistRow]:
        try:
            stmt: Select[Tuple[PlaylistRow]] = select(PlaylistRow).where(
                PlaylistRow.youtube_id == youtube_id
            )
            result: Result[Tuple[PlaylistRow]] = await session.execute(stmt)
            playlist: PlaylistRow | None = result.scalar_one_or_none()

            if not playlist:
                logger.error("Playlist not found")
                return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

            return AResult(code=AResultCode.OK, message="OK", result=playlist)

        except Exception as e:
            logger.error(f"Failed to get playlist from youtube_id {youtube_id}: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist from youtube_id {youtube_id}: {e}",
            )

    @staticmethod
    async def update_track_path_async(
        session: AsyncSession,
        track_id: int,
        path: str,
    ) -> AResultCode:
        try:
            stmt: Select[Tuple[TrackRow]] = select(TrackRow).where(
                TrackRow.id == track_id
            )
            result: Result[Tuple[TrackRow]] = await session.execute(stmt)
            track_row: TrackRow | None = result.scalar_one_or_none()
            if not track_row:
                logger.warning(f"Could not find track {track_id} to update path")
                return AResultCode(
                    code=AResultCode.NOT_FOUND,
                    message=f"Track {track_id} not found",
                )
            track_row.path = path
            await session.commit()
            return AResultCode(code=AResultCode.OK, message="OK")
        except Exception as e:
            logger.error(f"Failed to update track path: {e}")
            return AResultCode(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to update track path: {e}",
            )

    @staticmethod
    async def get_playlist_track_links_async(
        session: AsyncSession,
        playlist_id: int,
    ) -> AResult[List[Tuple[PlaylistTrackRow, TrackRow]]]:
        try:
            stmt: Select[Tuple[PlaylistTrackRow]] = select(PlaylistTrackRow).where(
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
                track: TrackRow | None = track_result.scalar_one_or_none()
                if track:
                    track_links.append((ptr, track))

            return AResult(code=AResultCode.OK, message="OK", result=track_links)

        except Exception as e:
            logger.error(f"Failed to get playlist track links: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get playlist track links: {e}",
            )

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
            full_path = os.path.join(IMAGES_PATH, "youtubeMusic", filename)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
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
    async def get_or_create_artist(
        session: AsyncSession,
        raw: "YoutubeMusicArtist",
        provider_id: int,
    ) -> AResult[ArtistRow]:
        try:
            stmt = select(ArtistRow).where(ArtistRow.youtube_id == raw.youtube_id)
            result = await session.execute(stmt)
            existing: ArtistRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            a_img: AResult[ImageRow] = (
                await YoutubeMusicAccess._download_and_create_internal_image(
                    session, raw.thumbnail_url
                )
            )
            image_id: int
            if a_img.is_ok():
                image_id = a_img.result().id
            else:
                a_result_image: AResult[ImageRow] = (
                    await Image.get_image_from_path_async(
                        session=session, path="artist-placeholder.png"
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
                youtube_id=raw.youtube_id,
                name=raw.name,
                image_id=image_id,
            )
            session.add(artist_row)
            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=artist_row)

        except IntegrityError as e:
            logger.warning(
                f"IntegrityError in get_or_create_artist for {raw.youtube_id}, rolling back and fetching existing. Error: {e}"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(ArtistRow).where(ArtistRow.youtube_id == raw.youtube_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            logger.error(
                f"Artist {raw.youtube_id} not found after IntegrityError rollback"
            )
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
        raw: "YoutubeMusicAlbum",
        artist_map: Dict[str, ArtistRow],
        provider_id: int,
    ) -> AResult[AlbumRow]:
        try:
            stmt = select(AlbumRow).where(AlbumRow.youtube_id == raw.youtube_id)
            result = await session.execute(stmt)
            existing: AlbumRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            a_img: AResult[ImageRow] = (
                await YoutubeMusicAccess._download_and_create_internal_image(
                    session, raw.thumbnail_url
                )
            )
            if a_img.is_ok():
                image_id = a_img.result().id
            else:
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
                youtube_id=raw.youtube_id,
                image_id=image_id,
                title=raw.title,
                release_date=str(raw.release_year) if raw.release_year else "",
                year=raw.release_year,
            )
            session.add(album_row)
            await session.flush()

            if raw.artists:
                await session.refresh(album_row, attribute_names=["artists"])
                for artist_name in raw.artists:
                    for yt_artist in artist_map.values():
                        if yt_artist.name == artist_name:
                            album_row.artists.append(yt_artist)
                            break

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=album_row)

        except IntegrityError as e:
            logger.warning(
                f"IntegrityError in get_or_create_album for {raw.youtube_id}, rolling back and fetching existing. Error: {e}"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(AlbumRow).where(AlbumRow.youtube_id == raw.youtube_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            logger.error(
                f"Album {raw.youtube_id} not found after IntegrityError rollback"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get or create album after conflict",
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
        raw: "YoutubeMusicTrack",
        artist_map: Dict[str, ArtistRow],
        album_row: AlbumRow,
        provider_id: int,
    ) -> AResult[TrackRow]:
        try:
            stmt = (
                select(TrackRow)
                .where(TrackRow.youtube_id == raw.youtube_id)
                .options(selectinload(TrackRow.album).selectinload(AlbumRow.core_album))
            )
            result = await session.execute(stmt)
            existing: TrackRow | None = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)

            a_img: AResult[ImageRow] = (
                await YoutubeMusicAccess._download_and_create_internal_image(
                    session, raw.thumbnail_url
                )
            )
            if a_img.is_ok():
                image_id = a_img.result().id
            else:
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Failed to create internal image for track",
                )

            core_track = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.SONG.value,
            )
            session.add(core_track)
            await session.flush()

            track_row = TrackRow(
                id=core_track.id,
                youtube_id=raw.youtube_id,
                title=raw.title,
                duration_ms=raw.duration_ms,
                image_id=image_id,
                album_id=album_row.id,
                track_number=1,
                disc_number=1,
                isrc=raw.isrc,
            )
            session.add(track_row)
            await session.flush()
            track_row.core_song = core_track
            track_row.album = album_row

            for artist_name in raw.artists:
                for yt_artist in artist_map.values():
                    if yt_artist.name == artist_name:
                        track_row.artists.add(yt_artist)
                        break

            await session.flush()
            return AResult(code=AResultCode.OK, message="OK", result=track_row)

        except IntegrityError as e:
            logger.warning(
                f"IntegrityError in get_or_create_track for {raw.youtube_id}, rolling back and fetching existing. Error: {e}"
            )
            await session.rollback()
            session.expire_all()
            stmt = select(TrackRow).where(TrackRow.youtube_id == raw.youtube_id)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return AResult(code=AResultCode.OK, message="OK", result=existing)
            logger.error(
                f"Track {raw.youtube_id} not found after IntegrityError rollback"
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get or create track after conflict",
            )

        except Exception as e:
            logger.error(f"Failed to get/create track: {e}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get/create track: {e}",
            )
