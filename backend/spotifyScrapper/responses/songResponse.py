from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class SpotifyScrapperTrackResponse(BaseSongWithAlbumResponse):
    spotifyId: str
