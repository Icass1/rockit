import os
import asyncio
from typing import Any, Callable, Coroutine, Optional

from yt_dlp import YoutubeDL

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.framework.downloader.types import DownloadStatus
from backend.core.framework.websocket.webSocketManager import ws_manager


def _create_youtube_dl(opts: Any) -> Any:
    return YoutubeDL(opts)


logger = getLogger(__name__)


class YouTubeDownloader:
    @staticmethod
    async def download_as_mp3_async(
        youtube_url: str,
        download_id: int,
        user_id: int,
        public_id: str,
        title: str,
        artist: str,
        filename: str,
        progress_callback: Optional[
            Callable[[float, DownloadStatus], Coroutine[Any, Any, None]]
        ] = None,
    ) -> AResult[str]:
        return await YouTubeDownloader._download_async(
            youtube_url=youtube_url,
            download_id=download_id,
            user_id=user_id,
            public_id=public_id,
            title=title,
            artist=artist,
            filename=filename,
            format_type="mp3",
            progress_callback=progress_callback,
        )

    @staticmethod
    async def download_as_mp4_async(
        youtube_url: str,
        download_id: int,
        user_id: int,
        public_id: str,
        title: str,
        artist: str,
        filename: str,
        height: int = 1080,
        progress_callback: Optional[
            Callable[
                [float, DownloadStatus],
                Coroutine[Any, Any, None],
            ]
        ] = None,
    ) -> AResult[str]:
        return await YouTubeDownloader._download_async(
            youtube_url=youtube_url,
            download_id=download_id,
            user_id=user_id,
            public_id=public_id,
            title=title,
            artist=artist,
            filename=filename,
            format_type="mp4",
            height=height,
            progress_callback=progress_callback,
        )

    @staticmethod
    async def _download_async(
        youtube_url: str,
        download_id: int,
        user_id: int,
        public_id: str,
        title: str,
        artist: str,
        filename: str,
        format_type: str,
        height: int = 1080,
        progress_callback: Optional[
            Callable[
                [float, DownloadStatus],
                Coroutine[Any, Any, None],
            ]
        ] = None,
    ) -> AResult[str]:
        output_path: str = TEMP_PATH
        os.makedirs(output_path, exist_ok=True)

        output_template: str = os.path.join(output_path, f"{filename}.%(ext)s")

        expected_ext: str
        if format_type == "mp3":
            ydl_opts: dict[str, Any] = {
                "format": "bestaudio/best",
                "outtmpl": output_template,
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
                "quiet": True,
                "no_warnings": True,
            }
            expected_ext = "mp3"
        else:
            format_string: str = (
                f"bestvideo[height>={height}]+bestaudio/bestvideo[height>={height}]/best[height>={height}][ext=mp4]/best"
            )
            ydl_opts = {
                "format": format_string,
                "outtmpl": output_template,
                "merge_output_format": "mp4",
                "postprocessors": [
                    {
                        "key": "FFmpegVideoConvertor",
                        "preferedformat": "mp4",
                    }
                ],
                "quiet": True,
                "no_warnings": True,
            }
            expected_ext = "mp4"

        loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()

        def progress_hook(d: dict[str, Any]) -> None:
            status: str | None = d.get("status")
            if status == "downloading":
                total_bytes: float = float(
                    d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                )
                downloaded_bytes: float = float(d.get("downloaded_bytes", 0))
                if total_bytes > 0:
                    percent: float = (downloaded_bytes / total_bytes) * 100
                    loop.call_soon_threadsafe(
                        asyncio.create_task,
                        ws_manager.broadcast_progress(
                            user_id=user_id,
                            download_id=download_id,
                            public_id=public_id,
                            title=title,
                            artist=artist,
                            status="downloading",
                            progress=percent,
                            message=f"Downloading: {percent:.1f}%",
                        ),
                    )
                    if progress_callback:
                        loop.call_soon_threadsafe(
                            asyncio.create_task,
                            progress_callback(percent, "downloading"),
                        )
            elif status == "finished":
                loop.call_soon_threadsafe(
                    asyncio.create_task,
                    ws_manager.broadcast_progress(
                        user_id=user_id,
                        download_id=download_id,
                        public_id=public_id,
                        title=title,
                        artist=artist,
                        status="converting",
                        progress=100,
                        message="Download finished, converting...",
                    ),
                )
                if progress_callback:
                    loop.call_soon_threadsafe(
                        asyncio.create_task,
                        progress_callback(100, "converting"),
                    )

        ydl_opts["progress_hooks"] = [progress_hook]

        try:
            await ws_manager.broadcast_progress(
                user_id=user_id,
                download_id=download_id,
                public_id=public_id,
                title=title,
                artist=artist,
                status="starting",
                progress=0,
                message="Starting download...",
            )

            await loop.run_in_executor(
                None,
                lambda: _create_youtube_dl(ydl_opts).download([youtube_url]),
            )

            final_filename: str = f"{filename}.{expected_ext}"
            final_path: str = os.path.join(output_path, final_filename)

            if not os.path.exists(final_path):
                files: list[str] = os.listdir(output_path)
                matching: list[str] = [f for f in files if f.startswith(filename)]
                if matching:
                    final_path = os.path.join(output_path, matching[0])
                    final_filename = matching[0]

            await ws_manager.broadcast_progress(
                user_id=user_id,
                download_id=download_id,
                public_id=public_id,
                title=title,
                artist=artist,
                status="completed",
                progress=100,
                message="Download completed!",
            )

            return AResult(
                code=AResultCode.OK,
                message="Download completed",
                result=final_path,
            )

        except Exception as e:
            logger.error(f"Error downloading YouTube video: {e}", exc_info=True)
            await ws_manager.broadcast_progress(
                user_id=user_id,
                download_id=download_id,
                public_id=public_id,
                title=title,
                artist=artist,
                status="error",
                progress=0,
                message=f"Error: {str(e)}",
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Download error: {e}",
                result=None,
            )
