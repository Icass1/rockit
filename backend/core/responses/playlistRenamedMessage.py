from pydantic import BaseModel
from typing import Literal


class PlaylistRenamedMessage(BaseModel):
    type: Literal["playlist_renamed"] = "playlist_renamed"
    publicId: str
    name: str
