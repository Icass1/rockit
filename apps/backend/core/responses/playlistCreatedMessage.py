from typing import Literal

from pydantic import BaseModel


class PlaylistCreatedMessage(BaseModel):
    type: Literal["playlist_created"] = "playlist_created"
    publicId: str
