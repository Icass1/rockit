from typing import List, Literal
from pydantic import BaseModel


class ArtistSearchResultsItem(BaseModel):
    name: str
    url: str


class BaseSearchResultsItem(BaseModel):
    type: Literal["album", "playlist", "artist", "song", "video"]
    title: str
    url: str
    imageUrl: str
    artists: List[ArtistSearchResultsItem]
    provider: str


class SearchResultsResponse(BaseModel):
    results: List[BaseSearchResultsItem]
