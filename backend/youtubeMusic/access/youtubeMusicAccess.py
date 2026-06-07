from typing import Dict, List, Tuple, cast, TYPE_CHECKING

from sqlalchemy.future import select
from sqlalchemy import Result, Select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.utils.safeAsyncCall import safe_async
from backend.utils.backendUtils import create_id, time_it
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.youtubeMusic.access.db.ormModels.track import TrackRow
from backend.youtubeMusic.access.db.ormModels.album import AlbumRow
from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow
from backend.youtubeMusic.access.db.ormModels.playlist import PlaylistRow
from backend.youtubeMusic.access.db.ormModels.playlist_track import PlaylistTrackRow
from backend.youtubeMusic.access.db.associationTables.track_album_artists import (
    track_artists,
    album_artists,
)
from backend.youtubeMusic.framework.models.playlistTrackLink import PlaylistTrackLink

if TYPE_CHECKING:
    from backend.youtubeMusic.utils.youtubeMusicApi import (
        YoutubeMusicTrack,
        YoutubeMusicAlbum,
        YoutubeMusicArtist,
    )

logger = getLogger(__name__)


class YoutubeMusicAccess:
    @staticmethod
    @safe_async
    async def get_track_youtube_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
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

    @staticmethod
    @safe_async
    @time_it
    async def get_track_by_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[TrackRow]:
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
            .options(
                selectinload(TrackRow.album).selectinload(AlbumRow.core_album),
                selectinload(TrackRow.image),
                selectinload(TrackRow.core_song),
            )
        )
        result: Result[Tuple[TrackRow]] = await session.execute(stmt)
        track: TrackRow | None = result.scalar_one_or_none()

        if not track:
            logger.error("Track not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Track not found")

        return AResult(code=AResultCode.OK, message="OK", result=track)

    @staticmethod
    @safe_async
    async def get_track_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[TrackRow]:
        stmt: Select[Tuple[TrackRow]] = (
            select(TrackRow)
            .where(TrackRow.youtube_id == youtube_id)
            .options(
                selectinload(TrackRow.album).selectinload(AlbumRow.core_album),
                selectinload(TrackRow.image),
                selectinload(TrackRow.core_song),
            )
        )
        result: Result[Tuple[TrackRow]] = await session.execute(stmt)
        track: TrackRow | None = result.scalar_one_or_none()

        if not track:
            logger.warning(f"Track {youtube_id} not found")
            return AResult(
                code=AResultCode.NOT_FOUND, message=f"Track {youtube_id} not found"
            )

        return AResult(code=AResultCode.OK, message="OK", result=track)

    @staticmethod
    @safe_async
    async def get_album_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[AlbumRow]:
        stmt: Select[Tuple[AlbumRow]] = select(AlbumRow).where(
            AlbumRow.youtube_id == youtube_id
        )
        result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
        album: AlbumRow | None = result.scalar_one_or_none()

        if not album:
            logger.error(f"Album {youtube_id} not found")
            return AResult(
                code=AResultCode.NOT_FOUND, message=f"Album {youtube_id} not found"
            )

        return AResult(code=AResultCode.OK, message="OK", result=album)

    @staticmethod
    @safe_async
    async def get_artist_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[ArtistRow]:
        stmt: Select[Tuple[ArtistRow]] = select(ArtistRow).where(
            ArtistRow.youtube_id == youtube_id
        )
        result: Result[Tuple[ArtistRow]] = await session.execute(stmt)
        artist: ArtistRow | None = result.scalar_one_or_none()

        if not artist:
            logger.error("Artist not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Artist not found")

        return AResult(code=AResultCode.OK, message="OK", result=artist)

    @staticmethod
    @safe_async
    @time_it
    async def get_album_youtube_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
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

    @staticmethod
    @safe_async
    async def get_artist_youtube_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
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

    @staticmethod
    @safe_async
    async def get_tracks_from_album_id_async(
        session: AsyncSession,
        album_id: int,
    ) -> AResult[List[TrackRow]]:
        stmt: Select[Tuple[TrackRow]] = (
            select(TrackRow)
            .where(TrackRow.album_id == album_id)
            .order_by(TrackRow.disc_number, TrackRow.track_number)
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

    @staticmethod
    @safe_async
    @time_it
    async def get_artists_from_track_async(
        session: AsyncSession,
        track: TrackRow,
    ) -> AResult[List[ArtistRow]]:
        stmt: Select[tuple[ArtistRow]] = select(ArtistRow).where(
            ArtistRow.tracks.any(TrackRow.id == track.id)
        )
        result = await session.execute(stmt)
        artists: List[ArtistRow] = cast(List[ArtistRow], result.scalars().all())

        if not artists:
            logger.warning(f"Artists not found from track row {track.id}.")
            return AResult(
                code=AResultCode.NOT_FOUND,
                message=f"Error getting artists from track row. {track.id}",
            )

        return AResult(code=AResultCode.OK, message="OK", result=artists)

    @staticmethod
    @safe_async
    async def get_artists_from_album_async(
        session: AsyncSession,
        album: AlbumRow,
    ) -> AResult[List[ArtistRow]]:
        stmt: Select[tuple[ArtistRow]] = select(ArtistRow).where(
            ArtistRow.albums.any(AlbumRow.id == album.id)
        )
        result = await session.execute(stmt)
        artists: List[ArtistRow] = cast(List[ArtistRow], result.scalars().all())

        return AResult(code=AResultCode.OK, message="OK", result=artists)

    @staticmethod
    @safe_async
    async def get_tracks_from_artist_id_async(
        session: AsyncSession,
        artist_id: int,
    ) -> AResult[List[TrackRow]]:
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

    @staticmethod
    @safe_async
    async def get_playlist_youtube_id_from_public_id_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[str]:
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

        return AResult(code=AResultCode.OK, message="OK", result=playlist.youtube_id)

    @staticmethod
    @safe_async
    async def get_playlist_by_youtube_id_async(
        session: AsyncSession,
        youtube_id: str,
    ) -> AResult[PlaylistRow]:
        stmt: Select[Tuple[PlaylistRow]] = select(PlaylistRow).where(
            PlaylistRow.youtube_id == youtube_id
        )
        result: Result[Tuple[PlaylistRow]] = await session.execute(stmt)
        playlist: PlaylistRow | None = result.scalar_one_or_none()

        if not playlist:
            logger.error("Playlist not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Playlist not found")

        return AResult(code=AResultCode.OK, message="OK", result=playlist)

    @staticmethod
    @safe_async
    async def update_track_path_async(
        session: AsyncSession,
        track_id: int,
        path: str,
    ) -> AResultCode:
        stmt: Select[Tuple[TrackRow]] = select(TrackRow).where(TrackRow.id == track_id)
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

    @staticmethod
    @safe_async
    async def get_playlist_track_links_async(
        session: AsyncSession,
        playlist_id: int,
    ) -> AResult[List[PlaylistTrackLink]]:
        stmt: Select[Tuple[PlaylistTrackRow]] = select(PlaylistTrackRow).where(
            PlaylistTrackRow.playlist_id == playlist_id
        )
        result: Result[Tuple[PlaylistTrackRow]] = await session.execute(stmt)
        playlist_track_rows: List[PlaylistTrackRow] = cast(
            List[PlaylistTrackRow], result.scalars().all()
        )

        track_links: List[PlaylistTrackLink] = []
        for ptr in playlist_track_rows:
            track_stmt = select(TrackRow).where(TrackRow.id == ptr.song_id)
            track_result = await session.execute(track_stmt)
            track: TrackRow | None = track_result.scalar_one_or_none()
            if track:
                track_links.append(PlaylistTrackLink(playlist_track=ptr, track=track))

        return AResult(code=AResultCode.OK, message="OK", result=track_links)

    @staticmethod
    @safe_async
    async def get_or_create_artist_with_image_id_async(
        session: AsyncSession,
        raw: "YoutubeMusicArtist",
        provider_id: int,
        image_id: int,
    ) -> AResult[ArtistRow]:
        stmt = select(ArtistRow).where(ArtistRow.youtube_id == raw.youtube_id)
        result = await session.execute(stmt)
        existing: ArtistRow | None = result.scalar_one_or_none()
        if existing:
            return AResult(code=AResultCode.OK, message="OK", result=existing)

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

    @staticmethod
    @safe_async
    async def get_or_create_album_with_image_id_async(
        session: AsyncSession,
        raw: "YoutubeMusicAlbum",
        artist_map: Dict[str, ArtistRow],
        provider_id: int,
        image_id: int,
    ) -> AResult[AlbumRow]:
        stmt = (
            select(AlbumRow)
            .where(AlbumRow.youtube_id == raw.youtube_id)
            .options(selectinload(AlbumRow.core_album))
        )
        result = await session.execute(stmt)
        existing: AlbumRow | None = result.scalar_one_or_none()
        if existing:
            return AResult(code=AResultCode.OK, message="OK", result=existing)

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
        album_row.core_album = core_album

        if raw.artists:
            await session.refresh(album_row, attribute_names=["artists"])
            for artist_name in raw.artists:
                for yt_artist in artist_map.values():
                    if yt_artist.name == artist_name:
                        album_row.artists.append(yt_artist)
                        break

        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=album_row)

    @staticmethod
    @safe_async
    async def get_or_create_track_with_image_id_async(
        session: AsyncSession,
        raw: "YoutubeMusicTrack",
        artist_map: Dict[str, ArtistRow],
        album_row: AlbumRow,
        provider_id: int,
        image_id: int,
    ) -> AResult[TrackRow]:
        stmt = (
            select(TrackRow)
            .where(TrackRow.youtube_id == raw.youtube_id)
            .options(
                selectinload(TrackRow.album).selectinload(AlbumRow.core_album),
                selectinload(TrackRow.image),
                selectinload(TrackRow.core_song),
            )
        )
        result = await session.execute(stmt)
        existing: TrackRow | None = result.scalar_one_or_none()
        if existing:
            return AResult(code=AResultCode.OK, message="OK", result=existing)

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
            track_number=raw.track_number,
            disc_number=raw.disc_number,
            isrc=raw.isrc,
        )
        session.add(track_row)
        await session.flush()
        track_row.core_song = core_track
        track_row.album = album_row

        for artist_name in raw.artists:
            for yt_artist in artist_map.values():
                if yt_artist.name == artist_name:
                    await session.execute(
                        track_artists.insert().values(
                            track_id=track_row.id, artist_id=yt_artist.id
                        )
                    )
                    break

        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=track_row)

    @staticmethod
    @safe_async
    @time_it
    async def get_tracks_by_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[TrackRow]]:
        """Batch fetch tracks by public_ids in a single query."""
        stmt: Select[Tuple[TrackRow]] = (
            select(TrackRow)
            .join(
                CoreMediaRow,
                and_(
                    CoreMediaRow.id == TrackRow.id,
                    CoreMediaRow.media_type_key == MediaTypeEnum.SONG.value,
                ),
            )
            .where(CoreMediaRow.public_id.in_(public_ids))
            .options(
                selectinload(TrackRow.album).selectinload(AlbumRow.core_album),
                selectinload(TrackRow.image),
                selectinload(TrackRow.core_song),
            )
        )
        result: Result[Tuple[TrackRow]] = await session.execute(stmt)
        tracks: List[TrackRow] = cast(List[TrackRow], result.scalars().all())

        return AResult(code=AResultCode.OK, message="OK", result=tracks)

    @staticmethod
    @safe_async
    @time_it
    async def get_artists_for_tracks_batch_async(
        session: AsyncSession,
        track_ids: List[int],
    ) -> AResult[Dict[int, List[ArtistRow]]]:
        """Batch fetch artists for multiple tracks in a single query."""
        stmt = (
            select(ArtistRow, track_artists.c.track_id)
            .join(track_artists, ArtistRow.id == track_artists.c.artist_id)
            .where(track_artists.c.track_id.in_(track_ids))
        )
        result = await session.execute(stmt)
        rows = result.all()

        track_artists_map: Dict[int, List[ArtistRow]] = {tid: [] for tid in track_ids}
        for artist_row, track_id in rows:
            track_artists_map[track_id].append(artist_row)

        return AResult(code=AResultCode.OK, message="OK", result=track_artists_map)

    @staticmethod
    @safe_async
    @time_it
    async def get_albums_by_public_ids_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[AlbumRow]]:
        """Batch fetch albums by public_ids in a single query."""
        stmt: Select[Tuple[AlbumRow]] = (
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
        result: Result[Tuple[AlbumRow]] = await session.execute(stmt)
        albums: List[AlbumRow] = cast(List[AlbumRow], result.scalars().all())

        return AResult(code=AResultCode.OK, message="OK", result=albums)

    @staticmethod
    @safe_async
    @time_it
    async def get_artists_for_albums_batch_async(
        session: AsyncSession,
        album_ids: List[int],
    ) -> AResult[Dict[int, List[ArtistRow]]]:
        """Batch fetch artists for multiple albums in a single query."""
        stmt = (
            select(ArtistRow, album_artists.c.album_id)
            .join(album_artists, ArtistRow.id == album_artists.c.artist_id)
            .where(album_artists.c.album_id.in_(album_ids))
        )
        result = await session.execute(stmt)
        rows = result.all()

        album_artists_map: Dict[int, List[ArtistRow]] = {aid: [] for aid in album_ids}
        for artist_row, album_id in rows:
            album_artists_map[album_id].append(artist_row)

        return AResult(code=AResultCode.OK, message="OK", result=album_artists_map)

    @staticmethod
    @safe_async
    @time_it
    async def get_tracks_by_album_ids_async(
        session: AsyncSession,
        album_ids: List[int],
    ) -> AResult[List[TrackRow]]:
        """Batch fetch tracks by album IDs in a single query."""
        stmt: Select[Tuple[TrackRow]] = (
            select(TrackRow)
            .where(TrackRow.album_id.in_(album_ids))
            .options(
                selectinload(TrackRow.image),
                selectinload(TrackRow.core_song),
            )
            .order_by(TrackRow.album_id, TrackRow.disc_number, TrackRow.track_number)
        )
        result: Result[Tuple[TrackRow]] = await session.execute(stmt)
        tracks: List[TrackRow] = cast(List[TrackRow], result.scalars().all())

        return AResult(code=AResultCode.OK, message="OK", result=tracks)

    @staticmethod
    @safe_async
    async def get_artist_public_ids_by_youtube_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[dict[str, str]]:
        """Return a mapping of youtube_id → public_id for artists in the database."""

        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})

        stmt: Select[Tuple[str, str]] = (
            select(ArtistRow.youtube_id, CoreMediaRow.public_id)
            .join(CoreMediaRow, ArtistRow.id == CoreMediaRow.id)
            .where(ArtistRow.youtube_id.in_(youtube_ids))
        )
        result: Result[Tuple[str, str]] = await session.execute(stmt)
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={row[0]: row[1] for row in result.all()},
        )

    @staticmethod
    @safe_async
    async def get_album_public_ids_by_youtube_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[dict[str, str]]:
        """Return a mapping of youtube_id → public_id for albums in the database."""

        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})

        stmt: Select[Tuple[str, str]] = (
            select(AlbumRow.youtube_id, CoreMediaRow.public_id)
            .join(CoreMediaRow, AlbumRow.id == CoreMediaRow.id)
            .where(AlbumRow.youtube_id.in_(youtube_ids))
        )
        result: Result[Tuple[str, str]] = await session.execute(stmt)
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={row[0]: row[1] for row in result.all()},
        )

    @staticmethod
    @safe_async
    async def get_playlist_public_ids_by_youtube_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[dict[str, str]]:
        """Return a mapping of youtube_id → public_id for playlists in the database."""

        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})

        stmt: Select[Tuple[str, str]] = (
            select(PlaylistRow.youtube_id, CoreMediaRow.public_id)
            .join(CoreMediaRow, PlaylistRow.id == CoreMediaRow.id)
            .where(PlaylistRow.youtube_id.in_(youtube_ids))
        )
        result: Result[Tuple[str, str]] = await session.execute(stmt)
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={row[0]: row[1] for row in result.all()},
        )

    @staticmethod
    @safe_async
    async def get_downloaded_youtube_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[set[str]]:
        """Return the subset of youtube_ids whose path is not null."""

        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result=set())

        stmt: Select[Tuple[str]] = select(TrackRow.youtube_id).where(
            TrackRow.youtube_id.in_(youtube_ids),
            TrackRow.path.isnot(None),
        )
        result: Result[Tuple[str]] = await session.execute(stmt)
        return AResult(
            code=AResultCode.OK, message="OK", result={row[0] for row in result.all()}
        )

    @staticmethod
    @safe_async
    async def get_downloaded_youtube_public_ids_async(
        session: AsyncSession,
        youtube_ids: List[str],
    ) -> AResult[dict[str, str]]:
        """Return a mapping of youtube_id → public_id for downloaded tracks."""

        if not youtube_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})

        stmt: Select[Tuple[str, str]] = (
            select(TrackRow.youtube_id, CoreMediaRow.public_id)
            .join(CoreMediaRow, TrackRow.id == CoreMediaRow.id)
            .where(
                TrackRow.youtube_id.in_(youtube_ids),
                TrackRow.path.isnot(None),
            )
        )
        result: Result[Tuple[str, str]] = await session.execute(stmt)
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={row[0]: row[1] for row in result.all()},
        )
