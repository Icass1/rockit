from pydantic import BaseModel

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse


class UserPlaylistsResponse(BaseModel):
    playlists: list[BasePlaylistResponse]
