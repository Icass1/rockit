from typing import Optional
from pydantic import BaseModel


class SpotifyExternalImageResponse(BaseModel):
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
