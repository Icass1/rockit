from pydantic import BaseModel, Field
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)


class ArtistCatalogResponse(BaseModel):
    """Provider-owned local catalog references; never infer identity from a fuzzy match."""

    songIds: list[str] = Field(default_factory=list)
    albumIds: list[str] = Field(default_factory=list)
    ambiguous: bool = False


class ArtistPageResponse(BaseModel):
    artist: BaseArtistResponse
    songs: list[BaseSongWithAlbumResponse] = Field(
        default_factory=lambda: list[BaseSongWithAlbumResponse]()
    )
    albums: list[BaseAlbumWithoutSongsResponse] = Field(
        default_factory=lambda: list[BaseAlbumWithoutSongsResponse]()
    )
    relatedArtists: list[BaseArtistResponse] = Field(
        default_factory=lambda: list[BaseArtistResponse]()
    )
    totalSongs: int = 0
    totalAlbums: int = 0
    offset: int = 0
    hasMore: bool = False
    partial: bool = False
