from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse


class YoutubeMusicAlbumResponse(BaseAlbumWithSongsResponse):
    youtubeId: str
    year: int | None = None
