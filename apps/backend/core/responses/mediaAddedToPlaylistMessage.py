from typing import Literal

from pydantic import BaseModel


class MediaAddedToPlaylistMessage(BaseModel):
    type: Literal["media_added_to_playlist"] = "media_added_to_playlist"
    publicId: str
    playlistPublicId: str
    position: int
