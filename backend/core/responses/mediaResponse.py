from typing import Union

from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse


MediaResponse = Union[
    BaseSongWithAlbumResponse,
    BaseAlbumWithSongsResponse,
    BaseArtistResponse,
    BasePlaylistResponse,
    BaseVideoResponse,
]
