from pydantic import BaseModel

from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)


class UserPlaylistsResponse(BaseModel):
    playlists: list[BasePlaylistWithMediasResponse]
