from typing import List, Tuple, cast

from sqlalchemy import Result, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.core.aResult import AResult, AResultCode

from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.rockit.access.db.ormModels.song import RockitSongRow
from backend.rockit.access.db.ormModels.album import RockitAlbumRow
from backend.rockit.access.db.ormModels.video import RockitVideoRow
from backend.rockit.access.db.ormModels.artist import RockitArtistRow

logger = getLogger(__name__)


class RockitAccess:
    @staticmethod
    async def create_song_async(
        session: AsyncSession,
        name: str,
        artist_name: str,
        provider_id: int,
        image_path: str,
        image_url: str | None = None,
        duration_ms: int | None = None,
        file_path: str | None = None,
    ) -> AResult[RockitSongRow]:
        """Create a new song in core.media and rockit.song."""

        try:
            a_result_image: AResult[ImageRow] = (
                await RockitAccess._get_or_create_image_async(
                    session=session, path=image_path, url=image_url
                )
            )
            if a_result_image.is_not_ok():
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

            image: ImageRow = a_result_image.result()

            core_media: CoreMediaRow = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.SONG.value,
            )
            session.add(core_media)
            await session.flush()

            song: RockitSongRow = RockitSongRow(
                id=core_media.id,
                name=name,
                image_id=image.id,
                duration_ms=duration_ms,
                file_path=file_path,
            )
            session.add(song)
            await session.flush()

            a_result_artists = await RockitAccess._link_artists_by_name_async(
                session=session,
                artist_name=artist_name,
                image_id=image.id,
                target=song,
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error linking artists. {a_result_artists.info()}")

            return AResult(code=AResultCode.OK, message="OK", result=song)

        except Exception as e:
            logger.error(f"Error creating song: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error creating song"
            )

    @staticmethod
    async def create_album_async(
        session: AsyncSession,
        name: str,
        artist_name: str,
        provider_id: int,
        image_path: str,
        image_url: str | None = None,
        release_date: str | None = None,
    ) -> AResult[RockitAlbumRow]:
        """Create a new album in core.media and rockit.album."""

        try:
            a_result_image: AResult[ImageRow] = (
                await RockitAccess._get_or_create_image_async(
                    session=session, path=image_path, url=image_url
                )
            )
            if a_result_image.is_not_ok():
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

            image: ImageRow = a_result_image.result()

            core_media: CoreMediaRow = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.ALBUM.value,
            )
            session.add(core_media)
            await session.flush()

            album: RockitAlbumRow = RockitAlbumRow(
                id=core_media.id,
                name=name,
                image_id=image.id,
                release_date=release_date,
            )
            session.add(album)
            await session.flush()

            a_result_artists = await RockitAccess._link_artists_by_name_async(
                session=session,
                artist_name=artist_name,
                image_id=image.id,
                target=album,
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error linking artists. {a_result_artists.info()}")

            return AResult(code=AResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Error creating album: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error creating album"
            )

    @staticmethod
    async def add_song_to_album_async(
        session: AsyncSession,
        album_id: int,
        song_id: int,
        disc_number: int = 1,
        track_number: int = 1,
    ) -> AResult[RockitSongRow]:
        """Add a song to an album by setting its album_id."""

        try:
            stmt: Select[Tuple[RockitSongRow]] = select(RockitSongRow).where(
                RockitSongRow.id == song_id
            )
            result: Result[Tuple[RockitSongRow]] = await session.execute(stmt)
            song: RockitSongRow | None = result.scalar_one_or_none()

            if song is None:
                return AResult(code=AResultCode.NOT_FOUND, message="Song not found")

            song.album_id = album_id
            song.disc_number = disc_number
            song.track_number = track_number
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=song)

        except Exception as e:
            logger.error(f"Error adding song to album: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error adding song to album"
            )

    @staticmethod
    async def get_songs_async(
        session: AsyncSession,
        song_ids: List[int],
    ) -> AResult[List[RockitSongRow]]:
        """Get rockit songs by their internal IDs."""

        try:
            stmt: Select[Tuple[RockitSongRow]] = select(RockitSongRow).where(
                RockitSongRow.id.in_(song_ids)
            )
            result: Result[Tuple[RockitSongRow]] = await session.execute(stmt)
            rows: List[RockitSongRow] = cast(
                List[RockitSongRow], result.scalars().all()
            )

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"RockIt songs not found for ids: {song_ids}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit songs: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting rockit songs"
            )

    @staticmethod
    async def get_songs_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[RockitSongRow]]:
        """Get rockit songs by their public IDs (joins through core.media)."""

        try:
            stmt: Select[Tuple[RockitSongRow]] = (
                select(RockitSongRow)
                .join(CoreMediaRow, RockitSongRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id.in_(public_ids))
            )
            result: Result[Tuple[RockitSongRow]] = await session.execute(stmt)
            rows: List[RockitSongRow] = cast(
                List[RockitSongRow], result.scalars().all()
            )

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"RockIt songs not found for public ids: {public_ids}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(
                f"Error getting rockit songs by public ids: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting rockit songs by public ids",
            )

    @staticmethod
    async def get_albums_async(
        session: AsyncSession,
        album_ids: List[int],
    ) -> AResult[List[RockitAlbumRow]]:
        """Get rockit albums by their internal IDs."""

        try:
            stmt: Select[Tuple[RockitAlbumRow]] = select(RockitAlbumRow).where(
                RockitAlbumRow.id.in_(album_ids)
            )
            result: Result[Tuple[RockitAlbumRow]] = await session.execute(stmt)
            rows: List[RockitAlbumRow] = cast(
                List[RockitAlbumRow], result.scalars().all()
            )

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"RockIt albums not found for ids: {album_ids}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit albums: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting rockit albums"
            )

    @staticmethod
    async def get_albums_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[RockitAlbumRow]]:
        """Get rockit albums by their public IDs."""

        try:
            stmt: Select[Tuple[RockitAlbumRow]] = (
                select(RockitAlbumRow)
                .join(CoreMediaRow, RockitAlbumRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id.in_(public_ids))
            )
            result: Result[Tuple[RockitAlbumRow]] = await session.execute(stmt)
            rows: List[RockitAlbumRow] = cast(
                List[RockitAlbumRow], result.scalars().all()
            )

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"RockIt albums not found for public ids: {public_ids}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(
                f"Error getting rockit albums by public ids: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting rockit albums by public ids",
            )

    @staticmethod
    async def get_songs_for_album_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[RockitSongRow]]:
        """Get all songs in an album, ordered by disc and track number."""

        try:
            stmt: Select[Tuple[RockitSongRow]] = (
                select(RockitSongRow)
                .where(RockitSongRow.album_id == album_id)
                .order_by(RockitSongRow.disc_number, RockitSongRow.track_number)
            )
            result: Result[Tuple[RockitSongRow]] = await session.execute(stmt)
            rows: List[RockitSongRow] = cast(
                List[RockitSongRow], result.scalars().all()
            )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting songs for album: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting songs for album",
            )

    @staticmethod
    async def get_song_public_id_async(
        session: AsyncSession,
        song_id: int,
    ) -> AResult[str]:
        """Get the public_id for a song from core.media."""

        try:
            stmt: Select[Tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                CoreMediaRow.id == song_id
            )
            result: Result[Tuple[CoreMediaRow]] = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Media not found for song"
                )

            return AResult(code=AResultCode.OK, message="OK", result=row.public_id)

        except Exception as e:
            logger.error(f"Error getting song public_id: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting song public_id"
            )

    @staticmethod
    async def get_public_ids_by_ids_async(
        session: AsyncSession,
        ids: List[int],
    ) -> AResult[dict[int, str]]:
        """Map internal IDs to public IDs."""

        try:
            stmt: Select[Tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                CoreMediaRow.id.in_(ids)
            )
            result: Result[Tuple[CoreMediaRow]] = await session.execute(stmt)
            rows: List[CoreMediaRow] = cast(List[CoreMediaRow], result.scalars().all())

            mapping: dict[int, str] = {row.id: row.public_id for row in rows}

            return AResult(code=AResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Error mapping ids to public ids: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error mapping ids to public ids",
            )

    @staticmethod
    async def _get_or_create_image_async(
        session: AsyncSession,
        path: str,
        url: str | None = None,
    ) -> AResult[ImageRow]:
        """Get or create an ImageRow."""

        try:
            from backend.core.access.imageAccess import ImageAccess

            return await ImageAccess.create_image_async(
                session=session, path=path, url=url
            )

        except Exception as e:
            logger.error(f"Error getting or creating image: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting or creating image",
            )

    @staticmethod
    async def _link_artists_by_name_async(
        session: AsyncSession,
        artist_name: str,
        image_id: int,
        target: RockitSongRow | RockitAlbumRow | RockitVideoRow,
    ) -> AResult[None]:
        """Parse comma-separated artist names, find or create artists, and link to target."""

        try:
            artist_names: List[str] = [
                a.strip() for a in artist_name.split(",") if a.strip()
            ]

            for name in artist_names:
                a_result_artist = await RockitAccess._get_or_create_artist_async(
                    session=session, name=name, image_id=image_id
                )
                if a_result_artist.is_ok():
                    artist: RockitArtistRow = a_result_artist.result()
                    if isinstance(target, RockitSongRow):
                        target.artists.append(artist)
                    elif isinstance(target, RockitAlbumRow):
                        target.artists.append(artist)
                    else:
                        target.artists.append(artist)

            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=None)

        except Exception as e:
            logger.error(f"Error linking artists: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error linking artists"
            )

    @staticmethod
    async def _get_or_create_artist_async(
        session: AsyncSession,
        name: str,
        image_id: int,
    ) -> AResult[RockitArtistRow]:
        """Find an artist by name, or create a new one."""

        try:
            stmt: Select[Tuple[RockitArtistRow]] = select(RockitArtistRow).where(
                RockitArtistRow.name == name
            )
            result: Result[Tuple[RockitArtistRow]] = await session.execute(stmt)
            artist: RockitArtistRow | None = result.scalar_one_or_none()

            if artist is not None:
                return AResult(code=AResultCode.OK, message="OK", result=artist)

            artist = RockitArtistRow(name=name, image_id=image_id)
            session.add(artist)
            await session.flush()

            return AResult(code=AResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Error getting or creating artist: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting or creating artist",
            )

    @staticmethod
    async def create_video_async(
        session: AsyncSession,
        name: str,
        artist_name: str,
        provider_id: int,
        image_path: str,
        image_url: str | None = None,
        duration_ms: int | None = None,
        file_path: str | None = None,
    ) -> AResult[RockitVideoRow]:
        """Create a new video in core.media and rockit.video."""

        try:
            a_result_image: AResult[ImageRow] = (
                await RockitAccess._get_or_create_image_async(
                    session=session, path=image_path, url=image_url
                )
            )
            if a_result_image.is_not_ok():
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

            image: ImageRow = a_result_image.result()

            core_media: CoreMediaRow = CoreMediaRow(
                public_id=create_id(32),
                provider_id=provider_id,
                media_type_key=MediaTypeEnum.VIDEO.value,
            )
            session.add(core_media)
            await session.flush()

            video: RockitVideoRow = RockitVideoRow(
                id=core_media.id,
                name=name,
                image_id=image.id,
                duration_ms=duration_ms,
                file_path=file_path,
            )
            session.add(video)
            await session.flush()

            a_result_artists = await RockitAccess._link_artists_by_name_async(
                session=session,
                artist_name=artist_name,
                image_id=image.id,
                target=video,
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error linking artists. {a_result_artists.info()}")

            return AResult(code=AResultCode.OK, message="OK", result=video)

        except Exception as e:
            logger.error(f"Error creating video: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error creating video"
            )

    @staticmethod
    async def get_videos_from_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[RockitVideoRow]]:
        """Get rockit videos by their public IDs (joins through core.media)."""

        try:
            stmt: Select[Tuple[RockitVideoRow]] = (
                select(RockitVideoRow)
                .join(CoreMediaRow, RockitVideoRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id.in_(public_ids))
            )
            result: Result[Tuple[RockitVideoRow]] = await session.execute(stmt)
            rows: List[RockitVideoRow] = cast(
                List[RockitVideoRow], result.scalars().all()
            )

            if not rows:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message=f"RockIt videos not found for public ids: {public_ids}",
                )

            return AResult(code=AResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(
                f"Error getting rockit videos by public ids: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error getting rockit videos by public ids",
            )

    @staticmethod
    async def get_video_public_id_async(
        session: AsyncSession,
        video_id: int,
    ) -> AResult[str]:
        """Get the public_id for a video from core.media."""

        try:
            stmt: Select[Tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                CoreMediaRow.id == video_id
            )
            result: Result[Tuple[CoreMediaRow]] = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return AResult(
                    code=AResultCode.NOT_FOUND, message="Media not found for video"
                )

            return AResult(code=AResultCode.OK, message="OK", result=row.public_id)

        except Exception as e:
            logger.error(f"Error getting video public_id: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting video public_id"
            )
