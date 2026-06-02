import asyncio
import os
import subprocess
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from yt_dlp import YoutubeDL

from backend.constants import TEMP_PATH
from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow

from backend.core.enums.downloadStatusEnum import DownloadStatusEnum
from backend.core.framework.websocket.webSocketManager import ws_manager


def _retry_sleep(n: int) -> int:
    return 2 ** min(n, 5)


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
            duration_seconds = float(result.stdout.strip())
            duration_ms = int(duration_seconds * 1000)
            logger.info(f"FFprobe got duration: {duration_ms}ms for {filepath}")
            return duration_ms
        logger.warning(
            f"FFprobe failed for {filepath}: returncode={result.returncode}, stdout='{result.stdout.strip()}', stderr='{result.stderr.strip()}'"
        )
    except Exception as e:
        logger.error(f"FFprobe exception for {filepath}: {e}", exc_info=True)
    return None


logger = getLogger(__name__)


async def _insert_and_broadcast(
    download_id: int,
    download_public_id: str,
    user_id: int,
    public_id: str,
    title: str,
    artist: str,
    status: DownloadStatusEnum,
    progress: float,
    message: str,
    date_started: datetime,
    date_ended: datetime | None,
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
        download_public_id=download_public_id,
        media_public_id=public_id,
        title=title,
        subTitle=artist,
        status=status,
        progress=progress,
        date_started=date_started,
        date_ended=date_ended,
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
    ) -> AResult[Dict[str, Any]]:
        async with rockit_db.session_scope_async() as session:
            a_result_row = await DownloadAccess.get_download_by_id(
                session=session, download_id=download_id
            )
            if a_result_row.is_not_ok():
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message=f"Download row {download_id} not found",
                )
            download_row = a_result_row.result()
            download_public_id: str = download_row.public_id
            date_started: datetime = download_row.date_started

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
                "retries": 15,
                "fragment_retries": 15,
                "retry_sleep": _retry_sleep,
                "socket_timeout": 30,
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
                "retries": 15,
                "fragment_retries": 15,
                "retry_sleep": _retry_sleep,
                "socket_timeout": 30,
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
                    percent: float = (downloaded_bytes / total_bytes) * 80
                    loop.call_soon_threadsafe(
                        asyncio.create_task,
                        _insert_and_broadcast(
                            download_id=download_id,
                            download_public_id=download_public_id,
                            user_id=user_id,
                            public_id=public_id,
                            title=title,
                            artist=artist,
                            status=DownloadStatusEnum.IN_PROGRESS,
                            progress=percent,
                            message=f"Downloading: {percent / 0.8:.1f}%",
                            date_started=date_started,
                            date_ended=None,
                        ),
                    )
            elif status == "finished":
                loop.call_soon_threadsafe(
                    asyncio.create_task,
                    _insert_and_broadcast(
                        download_id=download_id,
                        download_public_id=download_public_id,
                        user_id=user_id,
                        public_id=public_id,
                        title=title,
                        artist=artist,
                        status=DownloadStatusEnum.IN_PROGRESS,
                        progress=80,
                        message="Converting...",
                        date_started=date_started,
                        date_ended=None,
                    ),
                )

        ydl_opts["progress_hooks"] = [progress_hook]

        try:
            await _insert_and_broadcast(
                download_id=download_id,
                download_public_id=download_public_id,
                user_id=user_id,
                public_id=public_id,
                title=title,
                artist=artist,
                status=DownloadStatusEnum.IN_PROGRESS,
                progress=0,
                message="Starting download...",
                date_started=date_started,
                date_ended=None,
            )

            # Clean up stale .part files from previous failed attempts
            for f in os.listdir(output_path):
                if f.startswith(filename) and f.endswith(".part"):
                    os.remove(os.path.join(output_path, f))

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

            return AResult(
                code=AResultCode.OK,
                message="Download completed",
                result={"filepath": final_path, "duration_ms": real_duration_ms},
            )

        except Exception as e:
            logger.error(f"Error downloading YouTube video: {e}", exc_info=True)
            await _insert_and_broadcast(
                download_id=download_id,
                download_public_id=download_public_id,
                user_id=user_id,
                public_id=public_id,
                title=title,
                artist=artist,
                status=DownloadStatusEnum.FAILED,
                progress=0,
                message=f"Error: {str(e)}",
                date_started=date_started,
                date_ended=datetime.now(timezone.utc),
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Download error: {e}",
                result=None,
            )
