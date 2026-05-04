def __getattr__(name: str):
    if name == "downloads_manager":
        from backend.core.framework.downloader.downloadsManager import DownloadsManager

        return DownloadsManager()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
