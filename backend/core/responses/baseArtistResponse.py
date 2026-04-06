from pydantic import BaseModel
from typing import Literal


class BaseArtistResponse(BaseModel):
    type: Literal["artist"] = "artist"
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    imageUrl: str
