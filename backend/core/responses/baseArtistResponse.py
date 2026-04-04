from pydantic import BaseModel


class BaseArtistResponse(BaseModel):
    provider: str
    publicId: str
    url: str
    providerUrl: str
    name: str
    imageUrl: str
