from pydantic import BaseModel


class SpotifyScrapperExternalImageResponse(BaseModel):
    url: str
    width: int | None = None
    height: int | None = None
