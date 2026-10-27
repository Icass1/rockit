from pydantic import BaseModel


class CreatePlaylistRequest(BaseModel):
    name: str
    description: str | None = None
    isPublic: bool = True
