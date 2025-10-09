from datetime import datetime
from pydantic import BaseModel


class RockItSongPlaylistResponse(BaseModel):
    addedAt: datetime
