from typing import Optional

from pydantic import BaseModel


class StartFromSearchRequest(BaseModel):
    artistName: str
    trackName: str
    addToLibrary: bool = True
    addToPlaylist: bool = False
    playlistPublicId: Optional[str] = None
