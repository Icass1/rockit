from pydantic import BaseModel

from core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)


class UserPlaylistsResponse(BaseModel):
    playlists: list[BasePlaylistWithMediasResponse]
