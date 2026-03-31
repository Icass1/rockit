from typing import Optional

from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse


class YoutubeMusicAlbumResponse(BaseAlbumWithSongsResponse):
    youtubeId: str
    year: Optional[int] = None
