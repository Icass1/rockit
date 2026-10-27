from typing import cast

from sqlalchemy import func, Result as DBResult
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import Select

from core.access.db.ormModels.media import CoreMediaRow
from core.framework.models.localSong import LocalSong
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.utils.createId import create_id
from logger import getLogger
from result import Result, ResultCode
from rockit.access.db.associationTables.album_artists import album_artists
from rockit.access.db.associationTables.song_artists import song_artists
from rockit.access.db.associationTables.video_artists import video_artists
from rockit.access.db.ormModels.album import RockitAlbumRow
from rockit.access.db.ormModels.artist import RockitArtistRow
from rockit.access.db.ormModels.song import RockitSongRow
from rockit.access.db.ormModels.video import RockitVideoRow

logger = getLogger(__name__)


class RockitAccess:
    @staticmethod
    async def find_local_songs_async(session: AsyncSession, titles: list[str]) -> Result[list[LocalSong]]:
        """Batch-read downloaded RockIt metadata for local search matching."""
        if not titles:
            return Result(code=ResultCode.OK, message="OK", result=[])
        rows = (await session.execute(
            select(CoreMediaRow.public_id, RockitSongRow.name, RockitSongRow.file_path, RockitArtistRow.name)
            .select_from(RockitSongRow)
            .join(CoreMediaRow, CoreMediaRow.id == RockitSongRow.id)
            .join(song_artists, song_artists.c.song_id == RockitSongRow.id)
            .join(RockitArtistRow, RockitArtistRow.id == song_artists.c.artist_id)
            .where(func.lower(func.regexp_replace(func.trim(RockitSongRow.name), r"\s+", " ", "g")).in_(titles), RockitSongRow.file_path.isnot(None), RockitSongRow.file_path != "")
            .limit(1001)
        )).all()
        if len(rows) > 1000:
            logger.warning("Too many local song candidates; keeping explicit source selection")
            return Result(code=ResultCode.OK, message="OK", result=[])
        songs: dict[str, LocalSong] = {}
        for public_id, name, path, artist_name in rows:
            if not path:
                continue
            if public_id not in songs:
                songs[public_id] = LocalSong(public_id=public_id, name=name, artists=[], file_path=path)
            songs[public_id].artists.append(artist_name)
        return Result(code=ResultCode.OK, message="OK", result=list(songs.values()))

    @staticmethod
    async def create_song_async(
        session: AsyncSession,
        name: str,
        artist_names: list[str],
        provider_id: int,
        image_id: int,
        duration_ms: int,
        disc_number: int,
        track_number: int,
        storage_object_id: int,
    ) -> Result[RockitSongRow]:
        """Create a new song in core.media and rockit.song."""

        try:
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
                image_id=image_id,
                duration_ms=duration_ms,
                storage_object_id=storage_object_id,
                disc_number=disc_number,
                track_number=track_number,
            )
            session.add(song)
            await session.flush()

            a_result_artists = await RockitAccess._link_artists_by_name_async(
                session=session,
                artist_names=artist_names,
                image_id=image_id,
                target=song,
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error linking artists. {a_result_artists.info()}")

            return Result(code=ResultCode.OK, message="OK", result=song)

        except Exception as e:
            logger.error(f"Error creating song: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error creating song")

    @staticmethod
    async def create_album_async(
        session: AsyncSession,
        name: str,
        artist_names: list[str],
        provider_id: int,
        image_id: int,
        release_date: str,
    ) -> Result[RockitAlbumRow]:
        """Create a new album in core.media and rockit.album."""

        try:
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
                image_id=image_id,
                release_date=release_date,
            )
            session.add(album)
            await session.flush()

            a_result_artists = await RockitAccess._link_artists_by_name_async(
                session=session,
                artist_names=artist_names,
                image_id=image_id,
                target=album,
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error linking artists. {a_result_artists.info()}")

            return Result(code=ResultCode.OK, message="OK", result=album)

        except Exception as e:
            logger.error(f"Error creating album: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error creating album")

    @staticmethod
    async def add_song_to_album_async(
        session: AsyncSession,
        album_id: int,
        song_id: int,
        disc_number: int,
        track_number: int,
    ) -> Result[RockitSongRow]:
        """Add a song to an album by setting its album_id."""

        try:
            stmt: Select[tuple[RockitSongRow]] = select(RockitSongRow).where(
                RockitSongRow.id == song_id
            )
            result: DBResult[tuple[RockitSongRow]] = await session.execute(stmt)
            song: RockitSongRow | None = result.scalar_one_or_none()

            if song is None:
                return Result(code=ResultCode.NOT_FOUND, message="Song not found")

            song.album_id = album_id
            song.disc_number = disc_number
            song.track_number = track_number
            await session.flush()

            return Result(code=ResultCode.OK, message="OK", result=song)

        except Exception as e:
            logger.error(f"Error adding song to album: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error adding song to album")

    @staticmethod
    async def get_songs_async(
        session: AsyncSession,
        song_ids: list[int],
    ) -> Result[list[RockitSongRow]]:
        """Get rockit songs by their internal IDs."""

        try:
            stmt: Select[tuple[RockitSongRow]] = select(RockitSongRow).where(
                RockitSongRow.id.in_(song_ids)
            )
            result: DBResult[tuple[RockitSongRow]] = await session.execute(stmt)
            rows: list[RockitSongRow] = cast(list[RockitSongRow], result.scalars().all())

            if not rows:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt songs not found for ids: {song_ids}",
                )

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit songs: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting rockit songs")

    @staticmethod
    async def get_songs_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[list[RockitSongRow]]:
        """Get rockit songs by their public IDs (joins through core.media)."""

        try:
            stmt: Select[tuple[RockitSongRow]] = (
                select(RockitSongRow)
                .join(CoreMediaRow, RockitSongRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id.in_(public_ids))
                .options(
                    selectinload(RockitSongRow.artists),
                    selectinload(RockitSongRow.album).selectinload(RockitAlbumRow.artists),
                )
            )
            result: DBResult[tuple[RockitSongRow]] = await session.execute(stmt)
            rows: list[RockitSongRow] = cast(list[RockitSongRow], result.scalars().all())

            if not rows:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt songs not found for public ids: {public_ids}",
                )

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit songs by public ids: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting rockit songs by public ids",
            )

    @staticmethod
    async def get_albums_async(
        session: AsyncSession,
        album_ids: list[int],
    ) -> Result[list[RockitAlbumRow]]:
        """Get rockit albums by their internal IDs."""

        try:
            stmt: Select[tuple[RockitAlbumRow]] = select(RockitAlbumRow).where(
                RockitAlbumRow.id.in_(album_ids)
            )
            result: DBResult[tuple[RockitAlbumRow]] = await session.execute(stmt)
            rows: list[RockitAlbumRow] = cast(list[RockitAlbumRow], result.scalars().all())

            if not rows:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt albums not found for ids: {album_ids}",
                )

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit albums: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting rockit albums")

    @staticmethod
    async def get_albums_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[list[RockitAlbumRow]]:
        """Get rockit albums by their public IDs."""

        try:
            stmt: Select[tuple[RockitAlbumRow]] = (
                select(RockitAlbumRow)
                .join(CoreMediaRow, RockitAlbumRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id.in_(public_ids))
            )
            result: DBResult[tuple[RockitAlbumRow]] = await session.execute(stmt)
            rows: list[RockitAlbumRow] = cast(list[RockitAlbumRow], result.scalars().all())

            if not rows:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt albums not found for public ids: {public_ids}",
                )

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit albums by public ids: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting rockit albums by public ids",
            )

    @staticmethod
    async def get_songs_for_album_async(
        session: AsyncSession,
        album_id: int,
    ) -> Result[list[RockitSongRow]]:
        """Get all songs in an album, ordered by disc and track number."""

        try:
            stmt: Select[tuple[RockitSongRow]] = (
                select(RockitSongRow)
                .where(RockitSongRow.album_id == album_id)
                .order_by(RockitSongRow.disc_number, RockitSongRow.track_number)
                .options(selectinload(RockitSongRow.artists))
            )
            result: DBResult[tuple[RockitSongRow]] = await session.execute(stmt)
            rows: list[RockitSongRow] = cast(list[RockitSongRow], result.scalars().all())

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting songs for album: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting songs for album",
            )

    @staticmethod
    async def get_song_public_id_async(
        session: AsyncSession,
        song_id: int,
    ) -> Result[str]:
        """Get the public_id for a song from core.media."""

        try:
            stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                CoreMediaRow.id == song_id
            )
            result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return Result(code=ResultCode.NOT_FOUND, message="Media not found for song")

            return Result(code=ResultCode.OK, message="OK", result=row.public_id)

        except Exception as e:
            logger.error(f"Error getting song public_id: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting song public_id")

    @staticmethod
    async def get_public_ids_by_ids_async(
        session: AsyncSession,
        ids: list[int],
    ) -> Result[dict[int, str]]:
        """Map internal IDs to public IDs."""

        try:
            stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(CoreMediaRow.id.in_(ids))
            result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
            rows: list[CoreMediaRow] = cast(list[CoreMediaRow], result.scalars().all())

            mapping: dict[int, str] = {row.id: row.public_id for row in rows}

            return Result(code=ResultCode.OK, message="OK", result=mapping)

        except Exception as e:
            logger.error(f"Error mapping ids to public ids: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error mapping ids to public ids",
            )

    @staticmethod
    async def _link_artists_by_name_async(
        session: AsyncSession,
        artist_names: list[str],
        image_id: int,
        target: RockitSongRow | RockitAlbumRow | RockitVideoRow,
    ) -> Result[bool]:
        """Find or create artists by name and link to target via association table."""

        try:
            for name in artist_names:
                a_result_artist = await RockitAccess._get_or_create_artist_async(
                    session=session, name=name, image_id=image_id
                )
                if a_result_artist.is_ok():
                    artist: RockitArtistRow = a_result_artist.result()
                    if isinstance(target, RockitSongRow):
                        await session.execute(
                            insert(song_artists).values(song_id=target.id, artist_id=artist.id)
                        )
                    elif isinstance(target, RockitAlbumRow):
                        await session.execute(
                            insert(album_artists).values(album_id=target.id, artist_id=artist.id)
                        )
                    else:
                        await session.execute(
                            insert(video_artists).values(video_id=target.id, artist_id=artist.id)
                        )

            await session.flush()

            return Result(code=ResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error linking artists: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error linking artists")

    @staticmethod
    async def _get_or_create_artist_async(
        session: AsyncSession,
        name: str,
        image_id: int,
    ) -> Result[RockitArtistRow]:
        """Find an artist by name, or create a new one."""

        try:
            stmt: Select[tuple[RockitArtistRow]] = select(RockitArtistRow).where(
                RockitArtistRow.name == name
            )
            result: DBResult[tuple[RockitArtistRow]] = await session.execute(stmt)
            artist: RockitArtistRow | None = result.scalar_one_or_none()

            if artist is not None:
                return Result(code=ResultCode.OK, message="OK", result=artist)

            artist = RockitArtistRow(name=name, image_id=image_id)
            session.add(artist)
            await session.flush()

            return Result(code=ResultCode.OK, message="OK", result=artist)

        except Exception as e:
            logger.error(f"Error getting or creating artist: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting or creating artist",
            )

    @staticmethod
    async def create_video_async(
        session: AsyncSession,
        name: str,
        artist_names: list[str],
        provider_id: int,
        image_id: int,
        duration_ms: int,
        storage_object_id: int,
    ) -> Result[RockitVideoRow]:
        """Create a new video in core.media and rockit.video."""

        try:
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
                image_id=image_id,
                duration_ms=duration_ms,
                storage_object_id=storage_object_id,
            )
            session.add(video)
            await session.flush()

            a_result_artists = await RockitAccess._link_artists_by_name_async(
                session=session,
                artist_names=artist_names,
                image_id=image_id,
                target=video,
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error linking artists. {a_result_artists.info()}")

            return Result(code=ResultCode.OK, message="OK", result=video)

        except Exception as e:
            logger.error(f"Error creating video: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error creating video")

    @staticmethod
    async def get_videos_async(
        session: AsyncSession,
        video_ids: list[int],
    ) -> Result[list[RockitVideoRow]]:
        """Get rockit videos by their internal IDs."""

        try:
            stmt: Select[tuple[RockitVideoRow]] = select(RockitVideoRow).where(
                RockitVideoRow.id.in_(video_ids)
            )
            result: DBResult[tuple[RockitVideoRow]] = await session.execute(stmt)
            rows: list[RockitVideoRow] = cast(list[RockitVideoRow], result.scalars().all())

            if not rows:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt videos not found for ids: {video_ids}",
                )

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit videos: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting rockit videos")

    @staticmethod
    async def get_videos_from_public_ids_async(
        session: AsyncSession,
        public_ids: list[str],
    ) -> Result[list[RockitVideoRow]]:
        """Get rockit videos by their public IDs (joins through core.media)."""

        try:
            stmt: Select[tuple[RockitVideoRow]] = (
                select(RockitVideoRow)
                .join(CoreMediaRow, RockitVideoRow.id == CoreMediaRow.id)
                .where(CoreMediaRow.public_id.in_(public_ids))
                .options(selectinload(RockitVideoRow.artists))
            )
            result: DBResult[tuple[RockitVideoRow]] = await session.execute(stmt)
            rows: list[RockitVideoRow] = cast(list[RockitVideoRow], result.scalars().all())

            if not rows:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt videos not found for public ids: {public_ids}",
                )

            return Result(code=ResultCode.OK, message="OK", result=rows)

        except Exception as e:
            logger.error(f"Error getting rockit videos by public ids: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message="Error getting rockit videos by public ids",
            )

    @staticmethod
    async def get_video_public_id_async(
        session: AsyncSession,
        video_id: int,
    ) -> Result[str]:
        """Get the public_id for a video from core.media."""

        try:
            stmt: Select[tuple[CoreMediaRow]] = select(CoreMediaRow).where(
                CoreMediaRow.id == video_id
            )
            result: DBResult[tuple[CoreMediaRow]] = await session.execute(stmt)
            row: CoreMediaRow | None = result.scalar_one_or_none()

            if row is None:
                return Result(code=ResultCode.NOT_FOUND, message="Media not found for video")

            return Result(code=ResultCode.OK, message="OK", result=row.public_id)

        except Exception as e:
            logger.error(f"Error getting video public_id: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting video public_id")

    @staticmethod
    async def search_songs_by_name_async(
        session: AsyncSession,
        query: str,
    ) -> Result[list[RockitSongRow]]:
        """Search rockit songs by name (case-insensitive partial match)."""

        try:
            stmt: Select[tuple[RockitSongRow]] = (
                select(RockitSongRow)
                .where(RockitSongRow.name.ilike(f"%{query}%"))
                .options(selectinload(RockitSongRow.artists))
            )
            result: DBResult[tuple[RockitSongRow]] = await session.execute(stmt)
            rows: list[RockitSongRow] = cast(list[RockitSongRow], result.scalars().all())
            return Result(code=ResultCode.OK, message="OK", result=rows)
        except Exception as e:
            logger.error(f"Error searching rockit songs: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error searching rockit songs")

    @staticmethod
    async def search_albums_by_name_async(
        session: AsyncSession,
        query: str,
    ) -> Result[list[RockitAlbumRow]]:
        """Search rockit albums by name (case-insensitive partial match)."""

        try:
            stmt: Select[tuple[RockitAlbumRow]] = (
                select(RockitAlbumRow)
                .where(RockitAlbumRow.name.ilike(f"%{query}%"))
                .options(selectinload(RockitAlbumRow.artists))
            )
            result: DBResult[tuple[RockitAlbumRow]] = await session.execute(stmt)
            rows: list[RockitAlbumRow] = cast(list[RockitAlbumRow], result.scalars().all())
            return Result(code=ResultCode.OK, message="OK", result=rows)
        except Exception as e:
            logger.error(f"Error searching rockit albums: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error searching rockit albums")

    @staticmethod
    async def search_videos_by_name_async(
        session: AsyncSession,
        query: str,
    ) -> Result[list[RockitVideoRow]]:
        """Search rockit videos by name (case-insensitive partial match)."""

        try:
            stmt: Select[tuple[RockitVideoRow]] = (
                select(RockitVideoRow)
                .where(RockitVideoRow.name.ilike(f"%{query}%"))
                .options(selectinload(RockitVideoRow.artists))
            )
            result: DBResult[tuple[RockitVideoRow]] = await session.execute(stmt)
            rows: list[RockitVideoRow] = cast(list[RockitVideoRow], result.scalars().all())
            return Result(code=ResultCode.OK, message="OK", result=rows)
        except Exception as e:
            logger.error(f"Error searching rockit videos: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error searching rockit videos")

    @staticmethod
    async def get_album_by_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> Result[RockitAlbumRow]:
        """Get a single rockit album by its internal ID."""

        try:
            stmt: Select[tuple[RockitAlbumRow]] = (
                select(RockitAlbumRow)
                .where(RockitAlbumRow.id == album_id)
                .options(selectinload(RockitAlbumRow.artists))
            )
            result: DBResult[tuple[RockitAlbumRow]] = await session.execute(stmt)
            row: RockitAlbumRow | None = result.scalar_one_or_none()

            if row is None:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message=f"RockIt album not found for id: {album_id}",
                )
            return Result(code=ResultCode.OK, message="OK", result=row)
        except Exception as e:
            logger.error(f"Error getting rockit album by id: {e}", exc_info=True)
            return Result(code=ResultCode.GENERAL_ERROR, message="Error getting rockit album")
