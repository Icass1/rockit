from enum import Enum


class DownloadStatusEnum(Enum):
    PENDING = 1
    IN_PROGRESS = 2
    COMPLETED = 3
    FAILED = 4
    FETCHING = 5
    WAITING_FOR_QUEUE_SETUP = 6
    RETRYING = 7
    CANCELLED = 8


TERMINAL_DOWNLOAD_STATUS_KEYS = (
    DownloadStatusEnum.COMPLETED.value,
    DownloadStatusEnum.FAILED.value,
    DownloadStatusEnum.CANCELLED.value,
)
