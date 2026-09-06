import os
import shutil
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import MEDIA_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.baseDownload import BaseDownload

from backend.youtube.framework.youtubeDownloader import YouTubeDownloader
from backend.youtube.framework.youtubeSearch import (
    YoutubeSearch,
    YoutubeSongQuery,
)

from backend.spotifyScrapper.access.db.ormModels.track import TrackRow
from backend.spotifyScrapper.access.db.ormModels.artist import ArtistRow
from backend.spotifyScrapper.access.spotifyScrapperAccess import SpotifyScrapperAccess
from backend.spotifyScrapper.access.trackAccess import TrackAccess

logger = getLogger(__name__)


class SpotifyScrapperDownload(BaseDownload):
    track_spotify_id: int
    download_url: str | None

    def __init__(
        self,
        public_id: str,
        download_id: int,
        download_group_id: int,
        user_id: int,
        track_spotify_id: int,
        download_url: str | None,
    ) -> None:
        super().__init__(
            public_id=public_id,
            download_id=download_id,
            download_group_id=download_group_id,
            user_id=user_id,
        )
        self.track_spotify_id = track_spotify_id
        self.download_url = download_url

    async def download_method_async(self, session: AsyncSession) -> AResultCode:
        logger.info(
            f"Downloading Spotify scrapper track with ID: {self.track_spotify_id}"
        )

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
                await SpotifyScrapperAccess.get_artists_from_track_row_async(
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

            self.title = track.name
            self.artist = ", ".join(artist_names)

            youtube_url: str | None = track.download_url

            alternative_urls: List[str] = []

            if not youtube_url:
                a_result_youtube: AResult[List[str]] = (
                    await YoutubeSearch.find_video_urls_async(
                        song=YoutubeSongQuery(
                            title=track.name,
                            artists=artist_names,
                            album_title=track.album.name,
                            duration_ms=track.duration_ms,
                        )
                    )
                )
                if a_result_youtube.is_not_ok():
                    logger.error(f"YouTube search failed: {a_result_youtube.info()}")
                    # Propagate the search result code so a song that simply
                    # has no match is not retried like a transient failure.
                    return AResultCode(
                        code=a_result_youtube.code(),
                        message=f"YouTube search failed: {a_result_youtube.message()}",
                    )

                candidate_urls: List[str] = a_result_youtube.result()
                youtube_url = candidate_urls[0]
                alternative_urls = candidate_urls[1:]
                logger.info(
                    f"Found {len(candidate_urls)} YouTube candidates, "
                    f"best is {youtube_url}"
                )
                # The URL is deliberately not persisted yet: caching a
                # video that turns out to be undownloadable would make
                # every future retry of this track reuse it.
            else:
                logger.info(f"Using download URL from database: {youtube_url}")

            filename: str = f"{track.spotify_id}_{self.download_id}"

            a_result_download: AResult[Dict[str, Any]] = (
                await YouTubeDownloader.download_as_mp3_async(
                    youtube_url=youtube_url,
                    download_id=self.download_id,
                    public_id=self.public_id,
                    title=track.name,
                    artist=", ".join(artist_names),
                    filename=filename,
                    user_id=self.user_id,
                    alternative_urls=alternative_urls,
                )
            )

            if a_result_download.is_not_ok():
                logger.error(f"Download failed: {a_result_download.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Download failed: {a_result_download.message()}",
                )

            downloaded_result: Dict[str, Any] = a_result_download.result()
            downloaded_filename: str = downloaded_result["filepath"]
            real_duration_ms: Optional[int] = downloaded_result.get("duration_ms")

            logger.info(f"Track downloaded successfully: {downloaded_filename}")

            final_relative_dir: str = os.path.join("spotify_scrapper")
            final_dir: str = os.path.join(MEDIA_PATH, "spotify_scrapper")
            final_path: str = os.path.join(final_dir, f"{track.spotify_id}.mp3")
            final_relative_path: str = os.path.join(
                final_relative_dir, f"{track.spotify_id}.mp3"
            )
            os.makedirs(final_dir, exist_ok=True)

            shutil.move(downloaded_filename, final_path)

            # Persist the candidate that actually produced a file, which is
            # not necessarily the one the search ranked first.
            downloaded_url: str = downloaded_result.get("source_url") or youtube_url

            a_result_update = await TrackAccess.update_track_path_async(
                session=session,
                track_id=track.id,
                path=final_relative_path,
                download_url=downloaded_url,
            )

            if a_result_update.is_not_ok():
                logger.error(f"Error updating track: {a_result_update.message()}")
                return AResultCode(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Error updating track: {a_result_update.message()}",
                )

            if real_duration_ms is not None:
                a_result_duration = await TrackAccess.update_track_real_duration_async(
                    session=session,
                    track_id=track.id,
                    real_duration_ms=real_duration_ms,
                )
                if a_result_duration.is_not_ok():
                    logger.error(
                        f"Error updating real duration: {a_result_duration.message()}"
                    )
            else:
                logger.warning(
                    f"No real duration available from download result for track {track.id}"
                )

            return AResultCode(code=AResultCode.OK, message="Download completed.")

        except Exception as e:
            logger.error(f"Error in download_method_async: {e}", exc_info=True)
            return AResultCode(
                code=AResultCode.GENERAL_ERROR, message=f"Download error: {e}"
            )
