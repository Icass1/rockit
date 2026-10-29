from typing import Literal

from pydantic import BaseModel


class PlaylistRenamedMessage(BaseModel):
    type: Literal["playlist_renamed"] = "playlist_renamed"
    publicId: str
    name: str
