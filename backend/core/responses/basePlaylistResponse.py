from pydantic import BaseModel


class BasePlaylistResponse(BaseModel):
    provider: str
    publicId: str
    name: str
