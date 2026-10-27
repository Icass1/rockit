from pydantic import BaseModel


class AddFromUrlRequest(BaseModel):
    url: str
    addToLibrary: bool
    addToPlaylist: bool
    playlistPublicId: str | None = None
