from pydantic import BaseModel


class BaseSongResponse(BaseModel):
    provider: str
    publicId: str
    name: str
