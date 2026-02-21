from typing import List, Literal
from pydantic import BaseModel


class BaseSearchItem(BaseModel):
    type: Literal["album", "playlist", "artist", "track"]
    title: str
    subTitle: str
    url: str


class ProviderSearchResponse(BaseModel):
    provider: str
    items: List[BaseSearchItem]
