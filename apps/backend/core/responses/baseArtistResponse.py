from typing import Literal

from pydantic import BaseModel


class BaseArtistResponse(BaseModel):
    type: Literal["artist"] = "artist"
    genre: str | None = None
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    imageUrl: str
    dominantColor: str
