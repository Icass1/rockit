from typing import List, Literal
from pydantic import BaseModel


class ArtistSearchResultsItem(BaseModel):
    name: str
    url: str


class BaseSearchResultsItem(BaseModel):
    type: Literal["album", "playlist", "artist", "song", "video", "radio"]
    title: str
    url: str
    providerUrl: str
    imageUrl: str
    artists: List[ArtistSearchResultsItem]
    provider: str


class SearchResultsResponse(BaseModel):
    results: List[BaseSearchResultsItem]
