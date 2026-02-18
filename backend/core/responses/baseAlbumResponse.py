from pydantic import BaseModel


class BaseAlbumResponse(BaseModel):
    publicId: str
