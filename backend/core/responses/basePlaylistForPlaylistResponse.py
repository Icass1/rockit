from typing import Literal, Optional

from pydantic import BaseModel


class BasePlaylistForPlaylistResponse(BaseModel):
    """Lightweight playlist response for embedding in another playlist."""

    type: Literal["playlist"] = "playlist"
    provider: str
    publicId: str
    url: str
    name: str
    imageUrl: str
    owner: str
    description: Optional[str] = None
    itemCount: int = 0
