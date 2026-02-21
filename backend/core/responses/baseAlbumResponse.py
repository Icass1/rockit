from pydantic import BaseModel


class BaseAlbumResponse(BaseModel):
    provider: str
    publicId: str
    name: str
