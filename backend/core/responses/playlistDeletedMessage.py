from pydantic import BaseModel
from typing import Literal


class PlaylistDeletedMessage(BaseModel):
    type: Literal["playlist_deleted"] = "playlist_deleted"
    publicId: str
