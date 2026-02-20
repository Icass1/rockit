from pydantic import BaseModel


class BaseSongResponse(BaseModel):
    provder: str
    publicId: str
