from typing import Literal

from pydantic import BaseModel, Field


class ArtistSearchResultsItem(BaseModel):
    name: str
    url: str


class BaseSearchResultsItem(BaseModel):
    type: Literal["album", "playlist", "artist", "song", "video", "radio"]
    searchResult: Literal[True] = True
    name: str
    providerUrl: str
    imageUrl: str
    artists: list[ArtistSearchResultsItem]
    provider: str
    downloaded: bool | None
    url: str | None
    # Set (plus downloaded=True) when this item is actually already available
    # in this Rockit instance (matched by name/artist in the DB), so the
    # frontend can play it directly instead of offering a re-download.
    publicId: str | None = None
    lyricsScore: float = Field(default=0, ge=0, le=1)


class SearchResultsResponse(BaseModel):
    results: list[BaseSearchResultsItem]
