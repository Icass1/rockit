from pydantic import BaseModel


class UpdatePlaylistRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    isPublic: bool | None = None
