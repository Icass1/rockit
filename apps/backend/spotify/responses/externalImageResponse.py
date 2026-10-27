from pydantic import BaseModel


class SpotifyExternalImageResponse(BaseModel):
    url: str
    width: int | None = None
    height: int | None = None
