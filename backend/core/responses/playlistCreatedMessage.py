from pydantic import BaseModel
from typing import Literal


class PlaylistCreatedMessage(BaseModel):
    type: Literal["playlist_created"] = "playlist_created"
    publicId: str
