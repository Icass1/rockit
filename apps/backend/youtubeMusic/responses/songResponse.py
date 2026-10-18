from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class YoutubeMusicTrackResponse(BaseSongWithAlbumResponse):
    youtubeId: str
