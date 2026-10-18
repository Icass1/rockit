from pydantic import BaseModel
from typing import Literal


class MediaRemovedFromPlaylistMessage(BaseModel):
    type: Literal["media_removed_from_playlist"] = "media_removed_from_playlist"
    publicId: str
    playlistPublicId: str
