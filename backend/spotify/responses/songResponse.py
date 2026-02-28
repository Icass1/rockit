from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class SongResponse(BaseSongWithAlbumResponse):
    spotifyId: str
