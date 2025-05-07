from typing import TypedDict, List, Optional
import json
from dataclasses import dataclass


@dataclass
class RawDownloadDB:
    id: str
    downloadId: str
    dateStarted: str
    dateEnded: str
    downloadURL: str
    status: str
    seen: str
    success: int
    fail: int


@dataclass
class DownloadDBFull:
    id: str
    downloadId: str
    dateStarted: str
    dateEnded: str
    downloadURL: str
    status: str
    seen: bool
    success: int
    fail: int


def parse_download(raw_download: Optional[RawDownloadDB]) -> Optional[DownloadDBFull]:
    if not raw_download:
        return None

    return DownloadDBFull(
        id=raw_download.id,
        downloadId=raw_download.downloadId,
        dateStarted=raw_download.dateStarted,
        dateEnded=raw_download.dateEnded,
        downloadURL=raw_download.downloadURL,
        status=raw_download.status,
        seen=True if raw_download.seen == "1" else False,
        success=raw_download.success,
        fail=raw_download.fail
    )


download_query = """
CREATE TABLE IF NOT EXISTS download (
    id TEXT NOT NULL PRIMARY KEY UNIQUE,
    userId TEXT NOT NULL,
    dateStarted TEXT NOT NULL,
    dateEnded TEXT,
    downloadURL TEXT NOT NULL,
    status TEXT NOT NULL,
    seen BOOLEAN DEFAULT "1" NOT NULL,
    success INTEGER,
    fail INTEGER
)"""
