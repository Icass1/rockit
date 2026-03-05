from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class SpotifySongResponse(BaseSongWithAlbumResponse):
    spotifyId: str
