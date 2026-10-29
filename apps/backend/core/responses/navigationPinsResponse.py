from typing import Literal

from pydantic import BaseModel

from core.models.navigationPin import RockitListKey


class NavigationPinResponse(BaseModel):
    type: Literal["artist", "album", "playlist"]
    publicId: str
    name: str
    imageUrl: str | None
    url: str
    builtinKey: RockitListKey | None = None


class NavigationPinsResponse(BaseModel):
    pins: list[NavigationPinResponse]
