import asyncio
import os
import subprocess
from typing import Any, Callable, Coroutine, Dict, List, Optional

from yt_dlp import YoutubeDL

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow

from backend.core.framework.downloader.types import DownloadStatus
from backend.core.framework.websocket.webSocketManager import ws_manager


def _create_youtube_dl(opts: Dict[str, Any]) -> YoutubeDL:
    return YoutubeDL(opts)  # type: ignore[arg-type]


def _get_duration_with_ffprobe(filepath: str) -> Optional[int]:
    try:
        cmd: List[str] = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            filepath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            return int(float(result.stdout.strip()) * 1000)
    except Exception:
        pass
    return None


logger = getLogger(__name__)


async def _insert_and_broadcast(
    download_id: int,
    user_id: int,
    public_id: str,
    title: str,
    artist: str,
    status: DownloadStatus,
    progress: float,
    message: str,
) -> None:
    async with rockit_db.session_scope_async() as session:
        a_result: AResult[DownloadStatusRow] = (
            await DownloadAccess.create_download_status(
                session=session,
                download_id=download_id,
                completed=progress,
                message=message,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error inserting download status. {a_result.info()}")

    await ws_manager.broadcast_progress(
        user_id=user_id,
        download_id=download_id,
        public_id=public_id,
        title=title,
        artist=artist,
        status=status,
        progress=progress,
        message=message,
    )


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
    ) -> AResult[Dict[str, Any]]:
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
    ) -> AResult[Dict[str, Any]]:
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
    ) -> AResult[Dict[str, Any]]:
        output_path: str = TEMP_PATH
        os.makedirs(output_path, exist_ok=True)

        output_template: str = os.path.join(output_path, f"{filename}.%(ext)s")

        expected_ext: str
        if format_type == "mp3":
            ydl_opts: Dict[str, Any] = {
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

        def progress_hook(d: Dict[str, Any]) -> None:
            status: Optional[str] = d.get("status")
            if status == "downloading":
                total_bytes: float = float(
                    d.get("total_bytes") or d.get("total_bytes_estimate", 0)
                )
                downloaded_bytes: float = float(d.get("downloaded_bytes", 0))
                if total_bytes > 0:
                    percent: float = (downloaded_bytes / total_bytes) * 100
                    loop.call_soon_threadsafe(
                        asyncio.create_task,
                        _insert_and_broadcast(
                            download_id=download_id,
                            user_id=user_id,
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
                    _insert_and_broadcast(
                        download_id=download_id,
                        user_id=user_id,
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
            await _insert_and_broadcast(
                download_id=download_id,
                user_id=user_id,
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
                files: List[str] = os.listdir(output_path)
                matching: List[str] = [f for f in files if f.startswith(filename)]
                if matching:
                    final_path = os.path.join(output_path, matching[0])
                    final_filename = matching[0]

            real_duration_ms: Optional[int] = _get_duration_with_ffprobe(final_path)

            await _insert_and_broadcast(
                download_id=download_id,
                user_id=user_id,
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
                result={"filepath": final_path, "duration_ms": real_duration_ms},
            )

        except Exception as e:
            logger.error(f"Error downloading YouTube video: {e}", exc_info=True)
            await _insert_and_broadcast(
                download_id=download_id,
                user_id=user_id,
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
