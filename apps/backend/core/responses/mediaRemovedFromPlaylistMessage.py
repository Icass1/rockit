from typing import Literal

from pydantic import BaseModel


class MediaRemovedFromPlaylistMessage(BaseModel):
    type: Literal["media_removed_from_playlist"] = "media_removed_from_playlist"
    publicId: str
    playlistPublicId: str
