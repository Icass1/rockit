from pydantic import BaseModel


class BaseArtistResponse(BaseModel):
    provider: str
    publicId: str
