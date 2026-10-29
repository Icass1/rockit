from typing import Literal

from pydantic import BaseModel


class BaseArtistResponse(BaseModel):
    type: Literal["artist"] = "artist"
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    imageUrl: str
    dominantColor: str
