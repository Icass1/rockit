from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse


class SpotifyTrackResponse(BaseSongWithAlbumResponse):
    spotifyId: str
