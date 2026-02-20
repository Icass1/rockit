from pydantic import BaseModel


class BasePlaylistResponse(BaseModel):
    provder: str
    publicId: str
