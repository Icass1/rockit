import os
import shutil
from difflib import SequenceMatcher
from typing import List, Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import SONGS_PATH
from backend.spotify.access.db.ormModels.artist import ArtistRow
from backend.spotify.access.db.ormModels.track import TrackRow
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
        album_title: str
        duration_seconds: int
        isrc: str

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

        logger.info(f"Downloading Spotify track with ID: {self.track_spotify_id}")

        try:
            a_result_track: AResult[TrackRow] = await TrackAccess.get_track_by_id_async(
                session=session, track_id=self.track_spotify_id
            )
            if a_result_track.is_not_ok():
                logger.error(f"Error getting track: {a_result_track.message()}")
                return AResultCode(
                    code=a_result_track.code(),
                    message=f"Error getting track: {a_result_track.message()}",
                )

            track: TrackRow = a_result_track.result()

            a_result_artists: AResult[List[ArtistRow]] = (
                await SpotifyAccess.get_artists_from_track_row_async(
                    session=session, track_row=track
                )
            )
            if a_result_artists.is_not_ok():
                logger.error(f"Error getting artists: {a_result_artists.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Error getting artists: {a_result_artists.message()}",
                )

            artists: List[ArtistRow] = a_result_artists.result()
            artist_names: list[str] = [artist.name for artist in artists]

            youtube_url: str | None = track.download_url

            if not youtube_url:
                song_info = self.SongInfo(
                    title=track.name,
                    artists=artist_names,
                    album_title=track.album.name,
                    duration_seconds=track.duration,
                    isrc=track.isrc,
                )

                a_result_youtube: AResult[str] = await self.search_best_youtube_video(
                    song=song_info
                )
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
        if song.isrc:
            query_parts.append(song.isrc)
        return " ".join(query_parts)

    def normalize_string(self, s: str) -> str:
        import re

        s = s.lower()
        s = re.sub(r"[^\w\s]", " ", s)
        s = re.sub(r"\s+", " ", s)
        return s.strip()

    def calculate_title_score(self, video_title: str, song_title: str) -> float:
        normalized_video = self.normalize_string(video_title)
        normalized_song: str = self.normalize_string(song_title)

        if normalized_song in normalized_video:
            return 1.0

        return SequenceMatcher(None, normalized_song, normalized_video).ratio()

    def calculate_channel_score(self, channel_title: str, artists: list[str]) -> float:
        normalized_channel = self.normalize_string(channel_title)

        is_official = any(
            kw in normalized_channel
            for kw in ["official", "vevo", "official video", "official audio"]
        )

        base_score: float = 0.0
        for artist in artists:
            normalized_artist = self.normalize_string(artist)
            if normalized_artist in normalized_channel:
                base_score = 1.0
                break
            if (
                SequenceMatcher(None, normalized_artist, normalized_channel).ratio()
                > 0.8
            ):
                base_score = 0.9
                break

        if base_score > 0 and is_official:
            return 1.0
        return base_score

    def score_video(
        self, video: RawYoutubeSearchResult, song: SongInfo
    ) -> tuple[float, str]:
        title_score: float = 0.0
        channel_score: float = 0.0

        if video.title:
            title_score = self.calculate_title_score(video.title, song.title)

        if video.channel_title:
            channel_score = self.calculate_channel_score(
                video.channel_title, song.artists
            )

        total_score: float = (title_score * 0.6) + (channel_score * 0.4)

        if title_score >= 0.8 and channel_score >= 0.8:
            total_score += 0.1

        reasons: list[str] = []
        if title_score >= 0.8:
            reasons.append("title_match")
        elif title_score >= 0.5:
            reasons.append("title_similar")
        if channel_score >= 0.8:
            reasons.append("channel_match")
        if channel_score >= 0.8 and any(
            kw in self.normalize_string(video.channel_title or "")
            for kw in ["official", "vevo"]
        ):
            reasons.append("official_channel")

        return total_score, ", ".join(reasons) if reasons else "no_match"

    async def search_best_youtube_video(self, song: SongInfo) -> AResult[str]:
        query: str = self.build_search_query(song=song)
        logger.info(f"Searching YouTube for: {query}")

        best_video: Optional[RawYoutubeSearchResult] = None
        best_score: float = 0.0
        best_reason: str = ""

        for order in ["relevance", "viewCount"]:
            if best_score >= 0.8:
                break

            logger.info(f"Trying search with order_by={order}")

            result: AResult[List[RawYoutubeSearchResult]] = (
                await youtube_api.search_videos_async(
                    query=query, max_results=15, order_by=order
                )
            )

            if result.is_not_ok():
                logger.warning(f"Search error with {order}: {result.message()}")
                continue

            videos: list[RawYoutubeSearchResult] = result.result()
            if not videos:
                logger.warning(f"No videos found with {order}")
                continue

            for video in videos:
                if not video.video_id:
                    continue
                if video.live_broadcast_content == "live":
                    continue
                if best_video and best_video.video_id == video.video_id:
                    continue

                score, reason = self.score_video(video, song)
                logger.info(
                    f"Video: {video.title} | Channel: {video.channel_title} | URL https://www.youtube.com/watch?v={video.video_id} | Score: {score:.2f} ({reason})"
                )

                if score > best_score:
                    best_score = score
                    best_video = video
                    best_reason = reason

        if best_video and best_video.video_id:
            youtube_url: str = f"https://www.youtube.com/watch?v={best_video.video_id}"
            logger.info(
                f"Best match: {best_video.title} - {best_video.channel_title} "
                f"(score: {best_score:.2f}, reason: {best_reason})"
            )
            return AResult(
                code=AResultCode.OK, message="Found best video", result=youtube_url
            )

        logger.error("No suitable YouTube video found for the track")
        return AResult(
            code=AResultCode.GENERAL_ERROR, message="No suitable video found"
        )
