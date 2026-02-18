from pydantic import BaseModel


class BasePlaylistResponse(BaseModel):
    publicId: str
