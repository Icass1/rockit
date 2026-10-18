from typing import Optional

from pydantic import BaseModel


class AddFromUrlRequest(BaseModel):
    url: str
    addToLibrary: bool
    addToPlaylist: bool
    playlistPublicId: Optional[str] = None
