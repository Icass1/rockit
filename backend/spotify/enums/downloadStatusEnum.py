from enum import Enum


class DownloadStatusEnum(Enum):
    PENDING = 1
    IN_PROGRESS = 2
    COMPLETED = 3
    FAILED = 4
    FETCHING = 5
    WAITING_FOR_QUEUE_SETUP = 6
    WAITING_FOR_SONGS = 7
