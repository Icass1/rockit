from typing import Literal

from pydantic import BaseModel


class NavigationPinResponse(BaseModel):
    type: Literal["artist", "album", "playlist"]
    publicId: str
    name: str
    imageUrl: str | None
    url: str


class NavigationPinsResponse(BaseModel):
    pins: list[NavigationPinResponse]
