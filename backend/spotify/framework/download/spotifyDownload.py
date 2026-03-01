import os
import shutil
from re import Match
from typing import List, Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import SONGS_PATH
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.baseDownload import BaseDownload
from backend.youtube.framework.youtubeApi import youtube_api, RawYoutubeSearchResult
from backend.youtube.framework.youtubeDownloader import YouTubeDownloader
from backend.spotify.access.spotifyAccess import SpotifyAccess
from backend.spotify.access.trackAccess import TrackAccess

logger = getLogger(__name__)


class SpotifyDownload(BaseDownload):
    track_spotify_id: int
    download_url: str | None

    @dataclass
    class SongInfo:
        title: str
        artists: list[str]
        album_title: Optional[str] = None
        duration_seconds: Optional[int] = None
        isrc: Optional[str] = None

    def __init__(
        self,
        public_id: str,
        download_id: int,
        track_spotify_id: int,
        download_url: str | None,
    ) -> None:
        """Create a SpotifyDownload for a single track."""

        super().__init__(public_id=public_id, download_id=download_id)
        self.track_spotify_id = track_spotify_id
        self.download_url = download_url

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        """Download the Spotify track asynchronously."""

        logger.info("SpotifyDownload.download_method_async")

        try:
            a_result_track = await TrackAccess.get_track_by_id_async(
                session, self.track_spotify_id
            )
            if a_result_track.is_not_ok():
                logger.error(f"Error getting track: {a_result_track.message()}")
                return AResultCode(
                    code=a_result_track.code(),
                    message=f"Error getting track: {a_result_track.message()}",
                )

            track = a_result_track.result()

            a_result_artists = await SpotifyAccess.get_artists_from_track_row_async(
                session, track
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error getting artists: {a_result_artists.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Error getting artists: {a_result_artists.message()}",
                )

            artists = a_result_artists.result()
            artist_names: list[str] = [artist.name for artist in artists]

            album_title: Optional[str] = None
            if track.album:
                album_title = track.album.name

            youtube_url: str | None = track.download_url

            if not youtube_url:
                song_info = self.SongInfo(
                    title=track.name,
                    artists=artist_names,
                    album_title=album_title,
                    duration_seconds=track.duration,
                    isrc=track.isrc,
                )

                a_result_youtube = await self.search_best_youtube_video(song_info)
                if a_result_youtube.is_not_ok():
                    logger.error(f"YouTube search failed: {a_result_youtube.message()}")
                    return AResultCode(
                        code=AResultCode.GENERAL_ERROR,
                        message=f"YouTube search failed: {a_result_youtube.message()}",
                    )

                youtube_url = a_result_youtube.result()
                logger.info(f"Found YouTube URL: {youtube_url}")

                a_result_update: AResultCode = (
                    await TrackAccess.update_track_path_async(
                        session=session,
                        track_id=track.id,
                        path=None,
                        download_url=youtube_url,
                    )
                )
                if a_result_update.is_not_ok():
                    logger.error(f"Error updating track: {a_result_update.message()}")
                    return AResultCode(
                        code=AResultCode.GENERAL_ERROR,
                        message=f"Error updating track: {a_result_update.message()}",
                    )
            else:
                logger.info(f"Using download URL from database: {youtube_url}")

            filename: str = f"{track.spotify_id}_{self.download_id}"

            async def progress_callback(progress: float, status: str):
                print("Progress callback:", progress, status)
                return None

            a_result_download: AResult[str] = (
                await YouTubeDownloader.download_as_mp3_async(
                    youtube_url=youtube_url,
                    download_id=self.download_id,
                    filename=filename,
                    progress_callback=progress_callback,
                )
            )

            if a_result_download.is_not_ok():
                logger.error(f"Download failed: {a_result_download.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Download failed: {a_result_download.message()}",
                )

            downloaded_filename: str = a_result_download.result()

            logger.info(f"Track downloaded successfully: {downloaded_filename}")

            final_relative_dir: str = os.path.join("spotify")
            final_dir: str = os.path.join(SONGS_PATH, "spotify")
            final_path: str = os.path.join(final_dir, f"{track.spotify_id}.mp3")
            final_relative_path: str = os.path.join(
                final_relative_dir, f"{track.spotify_id}.mp3"
            )
            os.makedirs(final_dir, exist_ok=True)

            shutil.move(downloaded_filename, final_path)

            a_result_update = await TrackAccess.update_track_path_async(
                session=session,
                track_id=track.id,
                path=final_relative_path,
                download_url=youtube_url,
            )

            if a_result_update.is_not_ok():
                logger.error(f"Error updating track: {a_result_update.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Error updating track: {a_result_update.message()}",
                )

            return AResultCode(code=AResultCode.OK, message="Download completed.")

        except Exception as e:
            logger.error(f"Error in download_method_async: {e}", exc_info=True)
            return AResultCode(
                code=AResultCode.GENERAL_ERROR, message=f"Download error: {e}"
            )

    def build_search_query(self, song: SongInfo) -> str:
        query_parts: list[str] = [song.title]
        query_parts.extend(song.artists)
        if song.album_title:
            query_parts.append(song.album_title)
        return " ".join(query_parts)

    def parse_youtube_duration(self, duration_str: str) -> int:
        import re

        match: Match[str] | None = re.match(
            r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str
        )
        if not match:
            return 0

        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds

    async def search_best_youtube_video(self, song: SongInfo) -> AResult[str]:
        query: str = self.build_search_query(song)
        logger.info(f"Searching YouTube for: {query}")

        result: AResult[List[RawYoutubeSearchResult]] = (
            await youtube_api.search_videos_async(
                query=query, max_results=10, order_by="relevance"
            )
        )

        if result.is_not_ok():
            logger.error(f"Search error: {result.message()}")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Search error: {result.message()}",
                result=None,
            )

        videos: list[RawYoutubeSearchResult] = result.result()
        if not videos:
            logger.error("No videos found")
            return AResult(
                code=AResultCode.GENERAL_ERROR, message="No videos found", result=None
            )

        best_video: Optional[RawYoutubeSearchResult] = None

        for video in videos:
            if not video.video_id:
                continue
            if video.live_broadcast_content == "live":
                continue
            best_video = video
            break

        if best_video and best_video.video_id:
            youtube_url: str = f"https://www.youtube.com/watch?v={best_video.video_id}"
            logger.info(f"Best match: {best_video.title} - {youtube_url}")
            return AResult(
                code=AResultCode.OK, message="Found best video", result=youtube_url
            )

        return AResult(code=AResultCode.GENERAL_ERROR, message="No best video found")
