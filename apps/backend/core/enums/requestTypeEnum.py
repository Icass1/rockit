from enum import Enum


class RequestTypeEnum(Enum):
    LYRICS = 1
    TITLE = 2
    ARTIST = 3
    ALBUM = 4
    GENRE = 5
    METADATA = 6
    COVER_ART = 7
    OTHER = 8
