from enum import Enum
from typing import Literal

MediaTypeName = Literal["artist", "album", "playlist", "song", "video", "radio"]


class MediaTypeEnum(Enum):
    ARTIST = 1
    ALBUM = 2
    PLAYLIST = 3
    SONG = 4
    VIDEO = 5
    RADIO = 6


MEDIA_TYPE_NAMES: dict[int, MediaTypeName] = {
    MediaTypeEnum.ARTIST.value: "artist",
    MediaTypeEnum.ALBUM.value: "album",
    MediaTypeEnum.PLAYLIST.value: "playlist",
    MediaTypeEnum.SONG.value: "song",
    MediaTypeEnum.VIDEO.value: "video",
    MediaTypeEnum.RADIO.value: "radio",
}
