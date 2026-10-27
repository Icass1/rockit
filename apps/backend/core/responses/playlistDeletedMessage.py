from typing import Literal

from pydantic import BaseModel


class PlaylistDeletedMessage(BaseModel):
    type: Literal["playlist_deleted"] = "playlist_deleted"
    publicId: str
