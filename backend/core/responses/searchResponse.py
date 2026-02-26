from typing import List, Literal
from pydantic import BaseModel


class ArtistSearchResultsItem(BaseModel):
    name: str
    url: str


class BaseSearchResultsItem(BaseModel):
    type: Literal["album", "playlist", "artist", "song"]
    title: str
    url: str
    imageUrl: str
    publicId: str
    artists: List[ArtistSearchResultsItem]


class ProviderSearchResultsResponse(BaseModel):
    provider: str
    items: List[BaseSearchResultsItem]


class SearchResultsResponse(BaseModel):
    results: List[ProviderSearchResultsResponse]
