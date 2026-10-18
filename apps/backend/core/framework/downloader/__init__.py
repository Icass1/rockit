from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.core.framework.downloader.downloadsManager import DownloadsManager

_downloads_manager: "DownloadsManager | None" = None


def __getattr__(name: str):
    global _downloads_manager
    if name == "downloads_manager":
        from backend.core.framework.downloader.downloadsManager import DownloadsManager

        if not _downloads_manager:
            _downloads_manager = DownloadsManager()

        return _downloads_manager

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
