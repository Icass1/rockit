import aiofiles
import shutil
from typing import List
from logging import Logger
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select as SA_Select

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.constants import BACKEND_URL, IMAGES_PATH, MEDIA_PATH

from backend.core.aResult import AResult, AResultCode

from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithoutAlbumResponse import (
    BaseSongWithoutAlbumResponse,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.searchResponse import (
    BaseSearchResultsItem,
    ArtistSearchResultsItem,
)
from backend.core.responses.uploadResponse import UploadResponse

from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.media import CoreMediaRow

from backend.core.framework.media.image import Image
from backend.core.access.imageAccess import ImageAccess

from backend.rockit.access.rockitAccess import RockitAccess
from backend.rockit.access.db.ormModels.song import RockitSongRow
from backend.rockit.access.db.ormModels.album import RockitAlbumRow
from backend.rockit.access.db.ormModels.video import RockitVideoRow

logger: Logger = getLogger(__name__)


class Rockit:
    provider_name: str = ""
    provider_id: int = 0

    @staticmethod
    async def _copy_from_path_async(src_path: str, dst_path: str) -> None:
        """Copy a file from src to dst in 1MB chunks without loading into RAM."""

        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        async with aiofiles.open(src_path, "rb") as src:
            async with aiofiles.open(dst_path, "wb") as dst:
                while True:
                    chunk = await src.read(1024 * 1024)
                    if not chunk:
                        break
                    await dst.write(chunk)

    @staticmethod
    async def _extract_duration_ms_async(file_path: str) -> int:
        """Extract duration in milliseconds from a media file using ffprobe."""

        import asyncio

        proc = await asyncio.create_subprocess_exec(
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            file_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        if stdout:
            try:
                duration = float(stdout.decode().strip())
                return int(duration * 1000)
            except (ValueError, UnicodeDecodeError):
                pass
        return 0

    @staticmethod
    async def upload_song_async(
        session: AsyncSession,
        title: str,
        artist_names: List[str],
        file_path: str,
        image_path: str,
        disc_number: int,
        track_number: int,
    ) -> AResult[UploadResponse]:
        """Upload a song file and create database records."""

        try:
            file_ext: str = "mp3"
            file_name: str = f"{create_id(32)}.{file_ext}"
            final_file_path: str = f"{MEDIA_PATH}/rockit/songs/{file_name}"

            await Rockit._copy_from_path_async(
                src_path=file_path, dst_path=final_file_path
            )

            duration_ms: int = await Rockit._extract_duration_ms_async(
                file_path=final_file_path
            )

            image_file_name: str = f"{create_id(32)}.jpg"
            image_rel_path: str = f"rockit/{image_file_name}"
            image_full_path: str = f"{IMAGES_PATH}/{image_rel_path}"
            os.makedirs(os.path.dirname(image_full_path), exist_ok=True)
            shutil.copy2(image_path, image_full_path)

            a_result_image: AResult[ImageRow] = await ImageAccess.create_image_async(
                session=session, path=image_rel_path
            )
            if a_result_image.is_not_ok():
                logger.error(f"Error creating image. {a_result_image.info()}")
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

            a_result_song: AResult[RockitSongRow] = (
                await RockitAccess.create_song_async(
                    session=session,
                    name=title,
                    artist_names=artist_names,
                    provider_id=Rockit.provider_id,
                    image_id=a_result_image.result().id,
                    duration_ms=duration_ms,
                    file_path=final_file_path,
                    disc_number=disc_number,
                    track_number=track_number,
                )
            )
            if a_result_song.is_not_ok():
                logger.error(f"Error creating song. {a_result_song.info()}")
                return AResult(
                    code=a_result_song.code(), message=a_result_song.message()
                )

            a_result_public_id: AResult[str] = (
                await RockitAccess.get_song_public_id_async(
                    session=session, song_id=a_result_song.result().id
                )
            )
            if a_result_public_id.is_not_ok():
                logger.error(f"Error getting public_id. {a_result_public_id.info()}")
                return AResult(
                    code=a_result_public_id.code(),
                    message=a_result_public_id.message(),
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=UploadResponse(
                    publicId=a_result_public_id.result(),
                    message="Song uploaded successfully",
                    filename=file_name,
                ),
            )

        except Exception as e:
            logger.error(f"Error uploading song: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error uploading song"
            )

    @staticmethod
    async def upload_album_async(
        session: AsyncSession,
        title: str,
        artist_name: List[str],
        song_titles: List[str],
        song_paths: dict[str, str],
        cover_path: str,
        release_date: str,
    ) -> AResult[UploadResponse]:
        """Upload an album with multiple songs."""

        try:
            image_file_name: str = f"{create_id(32)}.jpg"
            image_rel_path: str = f"rockit/{image_file_name}"
            image_full_path: str = f"{IMAGES_PATH}/{image_rel_path}"

            os.makedirs(os.path.dirname(image_full_path), exist_ok=True)

            shutil.copy2(cover_path, image_full_path)

            a_result_image: AResult[ImageRow] = await ImageAccess.create_image_async(
                session=session, path=image_rel_path
            )
            if a_result_image.is_not_ok():
                logger.error(f"Error creating image. {a_result_image.info()}")
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )
            image_id: int = a_result_image.result().id

            a_result_album: AResult[RockitAlbumRow] = (
                await RockitAccess.create_album_async(
                    session=session,
                    name=title,
                    artist_names=artist_name,
                    provider_id=Rockit.provider_id,
                    image_id=image_id,
                    release_date=release_date,
                )
            )
            if a_result_album.is_not_ok():
                logger.error(f"Error creating album. {a_result_album.info()}")
                return AResult(
                    code=a_result_album.code(), message=a_result_album.message()
                )

            album: RockitAlbumRow = a_result_album.result()

            for track_number, song_title in enumerate(song_titles, start=1):
                song_src_path: str = song_paths.get(song_title, "")

                if not song_src_path:
                    logger.warning(f"No file data for song '{song_title}', skipping.")
                    continue

                file_ext: str = "mp3"
                file_name: str = f"{create_id(32)}.{file_ext}"
                song_dst_path: str = f"{MEDIA_PATH}/rockit/songs/{file_name}"

                await Rockit._copy_from_path_async(
                    src_path=song_src_path, dst_path=song_dst_path
                )

                song_duration_ms: int = await Rockit._extract_duration_ms_async(
                    file_path=song_dst_path
                )

                a_result_song: AResult[RockitSongRow] = (
                    await RockitAccess.create_song_async(
                        session=session,
                        name=song_title,
                        artist_names=artist_name,
                        provider_id=Rockit.provider_id,
                        image_id=image_id,
                        duration_ms=song_duration_ms,
                        file_path=song_dst_path,
                        disc_number=1,
                        track_number=track_number,
                    )
                )
                if a_result_song.is_not_ok():
                    logger.error(
                        f"Error creating song '{song_title}'. {a_result_song.info()}"
                    )
                    continue

                await RockitAccess.add_song_to_album_async(
                    session=session,
                    album_id=album.id,
                    song_id=a_result_song.result().id,
                    disc_number=1,
                    track_number=track_number,
                )

            a_result_mapping: AResult[dict[int, str]] = (
                await RockitAccess.get_public_ids_by_ids_async(
                    session=session, ids=[album.id]
                )
            )
            if a_result_mapping.is_not_ok():
                logger.error(
                    f"Error getting album public_id. {a_result_mapping.info()}"
                )
                return AResult(
                    code=a_result_mapping.code(), message=a_result_mapping.message()
                )

            public_ids: dict[int, str] = a_result_mapping.result()
            album_public_id: str = public_ids.get(album.id, "")

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=UploadResponse(
                    publicId=album_public_id,
                    message=f"Album '{title}' uploaded with {len(song_titles)} songs",
                ),
            )

        except Exception as e:
            logger.error(f"Error uploading album: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error uploading album"
            )

    @staticmethod
    async def upload_video_async(
        session: AsyncSession,
        title: str,
        artist_names: List[str],
        file_path: str,
        image_path: str,
    ) -> AResult[UploadResponse]:
        """Upload a video file and create database records."""

        try:
            file_ext: str = "mp4"
            file_name: str = f"{create_id(32)}.{file_ext}"
            final_file_path: str = f"{MEDIA_PATH}/rockit/videos/{file_name}"

            await Rockit._copy_from_path_async(
                src_path=file_path, dst_path=final_file_path
            )

            duration_ms: int = await Rockit._extract_duration_ms_async(
                file_path=final_file_path
            )

            image_file_name: str = f"{create_id(32)}.jpg"
            image_rel_path: str = f"rockit/{image_file_name}"
            image_full_path: str = f"{IMAGES_PATH}/{image_rel_path}"
            os.makedirs(os.path.dirname(image_full_path), exist_ok=True)
            shutil.copy2(image_path, image_full_path)

            a_result_image: AResult[ImageRow] = await ImageAccess.create_image_async(
                session=session, path=image_rel_path
            )
            if a_result_image.is_not_ok():
                logger.error(f"Error creating image. {a_result_image.info()}")
                return AResult(
                    code=a_result_image.code(), message=a_result_image.message()
                )

            a_result_video: AResult[RockitVideoRow] = (
                await RockitAccess.create_video_async(
                    session=session,
                    name=title,
                    artist_names=artist_names,
                    provider_id=Rockit.provider_id,
                    image_id=a_result_image.result().id,
                    duration_ms=duration_ms,
                    file_path=final_file_path,
                )
            )
            if a_result_video.is_not_ok():
                logger.error(f"Error creating video. {a_result_video.info()}")
                return AResult(
                    code=a_result_video.code(), message=a_result_video.message()
                )

            a_result_public_id: AResult[str] = (
                await RockitAccess.get_video_public_id_async(
                    session=session, video_id=a_result_video.result().id
                )
            )
            if a_result_public_id.is_not_ok():
                logger.error(f"Error getting public_id. {a_result_public_id.info()}")
                return AResult(
                    code=a_result_public_id.code(),
                    message=a_result_public_id.message(),
                )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=UploadResponse(
                    publicId=a_result_public_id.result(),
                    message="Video uploaded successfully",
                    filename=file_name,
                ),
            )

        except Exception as e:
            logger.error(f"Error uploading video: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error uploading video"
            )

    @staticmethod
    async def get_videos_responses_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[BaseVideoResponse]]:
        """Build full video responses from public IDs."""

        try:
            a_result_videos: AResult[List[RockitVideoRow]] = (
                await RockitAccess.get_videos_from_public_ids_async(
                    session=session, public_ids=public_ids
                )
            )
            if a_result_videos.is_not_ok():
                return AResult(
                    code=a_result_videos.code(), message=a_result_videos.message()
                )

            videos: List[RockitVideoRow] = a_result_videos.result()

            a_result_mapping: AResult[dict[int, str]] = (
                await RockitAccess.get_public_ids_by_ids_async(
                    session=session, ids=[v.id for v in videos]
                )
            )
            if a_result_mapping.is_not_ok():
                return AResult(
                    code=a_result_mapping.code(), message=a_result_mapping.message()
                )

            id_to_public_id: dict[int, str] = a_result_mapping.result()

            responses: List[BaseVideoResponse] = []
            for video in videos:
                a_result_response = await Rockit._build_video_response_async(
                    session=session,
                    video=video,
                    public_id=id_to_public_id.get(video.id, ""),
                )
                if a_result_response.is_ok():
                    responses.append(a_result_response.result())

            response_by_public_id: dict[str, BaseVideoResponse] = {
                r.publicId: r for r in responses
            }

            ordered: List[BaseVideoResponse] = [
                response_by_public_id[pid]
                for pid in public_ids
                if pid in response_by_public_id
            ]

            return AResult(code=AResultCode.OK, message="OK", result=ordered)

        except Exception as e:
            logger.error(f"Error building video responses: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error building video responses",
            )

    @staticmethod
    async def get_songs_responses_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[BaseSongWithAlbumResponse]]:
        """Build full song responses from public IDs."""

        try:
            a_result_songs: AResult[List[RockitSongRow]] = (
                await RockitAccess.get_songs_from_public_ids_async(
                    session=session, public_ids=public_ids
                )
            )
            if a_result_songs.is_not_ok():
                return AResult(
                    code=a_result_songs.code(), message=a_result_songs.message()
                )

            songs: List[RockitSongRow] = a_result_songs.result()

            a_result_mapping: AResult[dict[int, str]] = (
                await RockitAccess.get_public_ids_by_ids_async(
                    session=session, ids=[s.id for s in songs]
                )
            )
            if a_result_mapping.is_not_ok():
                return AResult(
                    code=a_result_mapping.code(), message=a_result_mapping.message()
                )

            id_to_public_id: dict[int, str] = a_result_mapping.result()

            responses: List[BaseSongWithAlbumResponse] = []
            for song in songs:
                a_result_response = await Rockit._build_song_response_async(
                    session=session,
                    song=song,
                    public_id=id_to_public_id.get(song.id, ""),
                )
                if a_result_response.is_ok():
                    responses.append(a_result_response.result())

            response_by_public_id: dict[str, BaseSongWithAlbumResponse] = {
                r.publicId: r for r in responses
            }

            ordered: List[BaseSongWithAlbumResponse] = [
                response_by_public_id[pid]
                for pid in public_ids
                if pid in response_by_public_id
            ]

            return AResult(code=AResultCode.OK, message="OK", result=ordered)

        except Exception as e:
            logger.error(f"Error building song responses: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error building song responses",
            )

    @staticmethod
    async def get_albums_responses_async(
        session: AsyncSession,
        public_ids: List[str],
    ) -> AResult[List[BaseAlbumWithSongsResponse]]:
        """Build full album (with songs) responses from public IDs."""

        try:
            a_result_albums: AResult[List[RockitAlbumRow]] = (
                await RockitAccess.get_albums_from_public_ids_async(
                    session=session, public_ids=public_ids
                )
            )
            if a_result_albums.is_not_ok():
                return AResult(
                    code=a_result_albums.code(), message=a_result_albums.message()
                )

            albums: List[RockitAlbumRow] = a_result_albums.result()

            a_result_mapping: AResult[dict[int, str]] = (
                await RockitAccess.get_public_ids_by_ids_async(
                    session=session, ids=[a.id for a in albums]
                )
            )
            if a_result_mapping.is_not_ok():
                return AResult(
                    code=a_result_mapping.code(), message=a_result_mapping.message()
                )

            id_to_public_id: dict[int, str] = a_result_mapping.result()

            responses: List[BaseAlbumWithSongsResponse] = []
            for album in albums:
                a_result_response = await Rockit._build_album_response_async(
                    session=session,
                    album=album,
                    public_id=id_to_public_id.get(album.id, ""),
                )
                if a_result_response.is_ok():
                    responses.append(a_result_response.result())

            response_by_public_id: dict[str, BaseAlbumWithSongsResponse] = {
                r.publicId: r for r in responses
            }

            ordered: List[BaseAlbumWithSongsResponse] = [
                response_by_public_id[pid]
                for pid in public_ids
                if pid in response_by_public_id
            ]

            return AResult(code=AResultCode.OK, message="OK", result=ordered)

        except Exception as e:
            logger.error(f"Error building album responses: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error building album responses",
            )

    @staticmethod
    async def search_async(
        session: AsyncSession, query: str
    ) -> AResult[List[BaseSearchResultsItem]]:
        """Search rockit songs and albums by name."""

        try:
            results: List[BaseSearchResultsItem] = []

            song_stmt: SA_Select[tuple[RockitSongRow]] = select(RockitSongRow).where(
                RockitSongRow.name.ilike(f"%{query}%")
            )
            song_result = await session.execute(song_stmt)
            song_rows: List[RockitSongRow] = list(song_result.scalars().all())

            if song_rows:
                a_result_mapping: AResult[dict[int, str]] = (
                    await RockitAccess.get_public_ids_by_ids_async(
                        session=session, ids=[s.id for s in song_rows]
                    )
                )
                if a_result_mapping.is_ok():
                    id_to_public_id: dict[int, str] = a_result_mapping.result()

                    for song in song_rows:
                        public_id: str = id_to_public_id.get(song.id, "")
                        a_result_image: AResult[ImageRow] = (
                            await Rockit._get_image_for_media_async(
                                session=session, image_id=song.image_id
                            )
                        )
                        image_url: str = ""
                        if a_result_image.is_ok():
                            image_url = Image.get_internal_image_url(
                                a_result_image.result()
                            )

                        artists: List[ArtistSearchResultsItem] = [
                            ArtistSearchResultsItem(
                                name=artist.name,
                                url=f"/rockit/artist/{public_id}",
                            )
                            for artist in song.artists
                        ]

                        results.append(
                            BaseSearchResultsItem(
                                type="song",
                                name=song.name,
                                providerUrl=f"/rockit/song/{public_id}",
                                imageUrl=image_url,
                                artists=artists,
                                provider=Rockit.provider_name,
                                downloaded=True,
                                url=f"/rockit/song/{public_id}",
                            )
                        )

            album_stmt: SA_Select[tuple[RockitAlbumRow]] = select(RockitAlbumRow).where(
                RockitAlbumRow.name.ilike(f"%{query}%")
            )
            album_result = await session.execute(album_stmt)
            album_rows: List[RockitAlbumRow] = list(album_result.scalars().all())

            if album_rows:
                a_result_album_mapping: AResult[dict[int, str]] = (
                    await RockitAccess.get_public_ids_by_ids_async(
                        session=session, ids=[a.id for a in album_rows]
                    )
                )
                if a_result_album_mapping.is_ok():
                    id_to_pid: dict[int, str] = a_result_album_mapping.result()

                    for album in album_rows:
                        pid: str = id_to_pid.get(album.id, "")
                        a_result_img: AResult[ImageRow] = (
                            await Rockit._get_image_for_media_async(
                                session=session, image_id=album.image_id
                            )
                        )
                        img_url: str = ""
                        if a_result_img.is_ok():
                            img_url = Image.get_internal_image_url(
                                a_result_img.result()
                            )

                        results.append(
                            BaseSearchResultsItem(
                                type="album",
                                name=album.name,
                                providerUrl=f"/rockit/album/{pid}",
                                imageUrl=img_url,
                                artists=[
                                    ArtistSearchResultsItem(
                                        name=artist.name,
                                        url=f"/rockit/artist/{pid}",
                                    )
                                    for artist in album.artists
                                ],
                                provider=Rockit.provider_name,
                                downloaded=True,
                                url=f"/rockit/album/{pid}",
                            )
                        )

            video_stmt: SA_Select[tuple[RockitVideoRow]] = select(RockitVideoRow).where(
                RockitVideoRow.name.ilike(f"%{query}%")
            )
            video_result = await session.execute(video_stmt)
            video_rows: List[RockitVideoRow] = list(video_result.scalars().all())

            if video_rows:
                a_result_video_mapping: AResult[dict[int, str]] = (
                    await RockitAccess.get_public_ids_by_ids_async(
                        session=session, ids=[v.id for v in video_rows]
                    )
                )
                if a_result_video_mapping.is_ok():
                    id_to_pid: dict[int, str] = a_result_video_mapping.result()

                    for video in video_rows:
                        pid: str = id_to_pid.get(video.id, "")
                        a_result_img: AResult[ImageRow] = (
                            await Rockit._get_image_for_media_async(
                                session=session, image_id=video.image_id
                            )
                        )
                        img_url: str = ""
                        if a_result_img.is_ok():
                            img_url = Image.get_internal_image_url(
                                a_result_img.result()
                            )

                        results.append(
                            BaseSearchResultsItem(
                                type="video",
                                name=video.name,
                                providerUrl=f"/rockit/video/{pid}",
                                imageUrl=img_url,
                                artists=[
                                    ArtistSearchResultsItem(
                                        name=artist.name,
                                        url=f"/rockit/video/{pid}",
                                    )
                                    for artist in video.artists
                                ],
                                provider=Rockit.provider_name,
                                downloaded=True,
                                url=f"/rockit/video/{pid}",
                            )
                        )

            return AResult(code=AResultCode.OK, message="OK", result=results)

        except Exception as e:
            logger.error(f"Error searching rockit: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error searching rockit"
            )

    @staticmethod
    async def get_media_duration_ms_async(
        session: AsyncSession,
        public_id: str,
    ) -> AResult[int]:
        """Get the duration of a rockit song or video."""

        a_result_songs: AResult[List[RockitSongRow]] = (
            await RockitAccess.get_songs_from_public_ids_async(
                session=session, public_ids=[public_id]
            )
        )
        if a_result_songs.is_ok() and a_result_songs.result():
            duration_ms: int | None = a_result_songs.result()[0].duration_ms
            return AResult(code=AResultCode.OK, message="OK", result=duration_ms)

        a_result_videos: AResult[List[RockitVideoRow]] = (
            await RockitAccess.get_videos_from_public_ids_async(
                session=session, public_ids=[public_id]
            )
        )
        if a_result_videos.is_ok() and a_result_videos.result():
            duration_ms = a_result_videos.result()[0].duration_ms
            return AResult(code=AResultCode.OK, message="OK", result=duration_ms)

        return AResult(code=AResultCode.NOT_FOUND, message="RockIt media not found")

    @staticmethod
    async def _build_song_response_async(
        session: AsyncSession,
        song: RockitSongRow,
        public_id: str,
    ) -> AResult[BaseSongWithAlbumResponse]:
        """Build a full song response from a RockitSongRow."""

        try:
            a_result_image: AResult[ImageRow] = await Rockit._get_image_for_media_async(
                session=session, image_id=song.image_id
            )
            image_url: str = ""
            if a_result_image.is_ok():
                image_url = Image.get_internal_image_url(a_result_image.result())

            song_artists: List[BaseArtistResponse] = [
                BaseArtistResponse(
                    provider=Rockit.provider_name,
                    publicId=public_id,
                    url=f"/rockit/artist/{public_id}",
                    providerUrl="",
                    name=artist.name,
                    imageUrl=image_url,
                )
                for artist in song.artists
            ]

            audio_src: str | None = None
            if song.file_path:
                audio_src = f"{BACKEND_URL}/rockit/audio/{public_id}"

            album_response: BaseAlbumWithoutSongsResponse = (
                BaseAlbumWithoutSongsResponse(
                    provider=Rockit.provider_name,
                    publicId="",
                    url="",
                    providerUrl="",
                    name="",
                    artists=[],
                    releaseDate="",
                    imageUrl="",
                    undownloadedCount=0,
                )
            )

            if song.album_id is not None:
                stmt = select(RockitAlbumRow).where(RockitAlbumRow.id == song.album_id)
                result = await session.execute(stmt)
                album_row: RockitAlbumRow | None = result.scalar_one_or_none()

                if album_row is not None:
                    album_stmt = select(CoreMediaRow).where(
                        CoreMediaRow.id == album_row.id
                    )
                    album_result = await session.execute(album_stmt)
                    album_media: CoreMediaRow | None = album_result.scalar_one_or_none()
                    album_public_id: str = album_media.public_id if album_media else ""

                    a_result_album_image: AResult[ImageRow] = (
                        await Rockit._get_image_for_media_async(
                            session=session, image_id=album_row.image_id
                        )
                    )
                    album_image_url: str = ""
                    if a_result_album_image.is_ok():
                        album_image_url = Image.get_internal_image_url(
                            a_result_album_image.result()
                        )

                    album_artists_response: List[BaseArtistResponse] = [
                        BaseArtistResponse(
                            provider=Rockit.provider_name,
                            publicId=album_public_id,
                            url=f"/rockit/artist/{album_public_id}",
                            providerUrl="",
                            name=artist.name,
                            imageUrl=album_image_url,
                        )
                        for artist in album_row.artists
                    ]

                    album_response = BaseAlbumWithoutSongsResponse(
                        provider=Rockit.provider_name,
                        publicId=album_public_id,
                        url=f"/rockit/album/{album_public_id}",
                        providerUrl="",
                        name=album_row.name,
                        artists=album_artists_response,
                        releaseDate=album_row.release_date or "",
                        imageUrl=album_image_url,
                        undownloadedCount=0,
                    )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseSongWithAlbumResponse(
                    provider=Rockit.provider_name,
                    publicId=public_id,
                    providerUrl="",
                    name=song.name,
                    artists=song_artists,
                    audioSrc=audio_src,
                    downloaded=True,
                    imageUrl=image_url,
                    duration_ms=song.duration_ms,
                    discNumber=song.disc_number,
                    trackNumber=song.track_number,
                    album=album_response,
                ),
            )

        except Exception as e:
            logger.error(
                f"Error building song response for {public_id}: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error building song response",
            )

    @staticmethod
    async def _build_album_response_async(
        session: AsyncSession,
        album: RockitAlbumRow,
        public_id: str,
    ) -> AResult[BaseAlbumWithSongsResponse]:
        """Build a full album (with songs) response from a RockitAlbumRow."""

        try:
            a_result_image: AResult[ImageRow] = await Rockit._get_image_for_media_async(
                session=session, image_id=album.image_id
            )
            image_url: str = ""
            if a_result_image.is_ok():
                image_url = Image.get_internal_image_url(a_result_image.result())

            album_artists: List[BaseArtistResponse] = [
                BaseArtistResponse(
                    provider=Rockit.provider_name,
                    publicId=public_id,
                    url=f"/rockit/artist/{public_id}",
                    providerUrl="",
                    name=artist.name,
                    imageUrl=image_url,
                )
                for artist in album.artists
            ]

            a_result_songs: AResult[List[RockitSongRow]] = (
                await RockitAccess.get_songs_for_album_async(
                    session=session, album_id=album.id
                )
            )

            song_responses: List[BaseSongWithoutAlbumResponse] = []
            if a_result_songs.is_ok():
                a_result_mapping: AResult[dict[int, str]] = (
                    await RockitAccess.get_public_ids_by_ids_async(
                        session=session,
                        ids=[s.id for s in a_result_songs.result()],
                    )
                )
                id_to_public_id: dict[int, str] = {}
                if a_result_mapping.is_ok():
                    id_to_public_id = a_result_mapping.result()

                for song in a_result_songs.result():
                    song_pid: str = id_to_public_id.get(song.id, "")
                    song_image_url: str = image_url

                    a_result_song_image: AResult[ImageRow] = (
                        await Rockit._get_image_for_media_async(
                            session=session, image_id=song.image_id
                        )
                    )
                    if a_result_song_image.is_ok():
                        song_image_url = Image.get_internal_image_url(
                            a_result_song_image.result()
                        )

                    song_artists: List[BaseArtistResponse] = [
                        BaseArtistResponse(
                            provider=Rockit.provider_name,
                            publicId=song_pid,
                            url=f"/rockit/artist/{song_pid}",
                            providerUrl="",
                            name=artist.name,
                            imageUrl=song_image_url,
                        )
                        for artist in song.artists
                    ]

                    audio_src: str | None = None
                    if song.file_path:
                        audio_src = f"{BACKEND_URL}/rockit/audio/{song_pid}"

                    song_responses.append(
                        BaseSongWithoutAlbumResponse(
                            provider=Rockit.provider_name,
                            publicId=song_pid,
                            providerUrl="",
                            name=song.name,
                            artists=song_artists,
                            audioSrc=audio_src,
                            downloaded=True,
                            imageUrl=song_image_url,
                            duration_ms=song.duration_ms,
                            discNumber=song.disc_number,
                            trackNumber=song.track_number,
                        )
                    )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseAlbumWithSongsResponse(
                    provider=Rockit.provider_name,
                    publicId=public_id,
                    url=f"/rockit/album/{public_id}",
                    providerUrl="",
                    name=album.name,
                    artists=album_artists,
                    releaseDate=album.release_date or "",
                    imageUrl=image_url,
                    undownloadedCount=0,
                    songs=song_responses,
                ),
            )

        except Exception as e:
            logger.error(
                f"Error building album response for {public_id}: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error building album response",
            )

    @staticmethod
    async def _build_video_response_async(
        session: AsyncSession,
        video: RockitVideoRow,
        public_id: str,
    ) -> AResult[BaseVideoResponse]:
        """Build a full video response from a RockitVideoRow."""

        try:
            a_result_image: AResult[ImageRow] = await Rockit._get_image_for_media_async(
                session=session, image_id=video.image_id
            )
            image_url: str = ""
            if a_result_image.is_ok():
                image_url = Image.get_internal_image_url(a_result_image.result())

            video_artists: List[BaseArtistResponse] = [
                BaseArtistResponse(
                    provider=Rockit.provider_name,
                    publicId=public_id,
                    url=f"/rockit/artist/{public_id}",
                    providerUrl="",
                    name=artist.name,
                    imageUrl=image_url,
                )
                for artist in video.artists
            ]

            video_src: str | None = None
            if video.file_path:
                video_src = f"{BACKEND_URL}/rockit/video/{public_id}"

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=BaseVideoResponse(
                    provider=Rockit.provider_name,
                    publicId=public_id,
                    providerUrl="",
                    name=video.name,
                    videoSrc=video_src,
                    audioSrc=None,
                    imageUrl=image_url,
                    duration_ms=video.duration_ms,
                    artists=video_artists,
                    downloaded=True,
                ),
            )

        except Exception as e:
            logger.error(
                f"Error building video response for {public_id}: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="Error building video response",
            )

    @staticmethod
    async def _get_image_for_media_async(
        session: AsyncSession,
        image_id: int,
    ) -> AResult[ImageRow]:
        """Get an ImageRow by its ID."""

        try:
            from backend.core.access.imageAccess import ImageAccess

            return await ImageAccess.get_image_from_id_async(
                session=session, id=image_id
            )

        except Exception as e:
            logger.error(f"Error getting image: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="Error getting image"
            )
