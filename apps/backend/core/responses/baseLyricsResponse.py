from pydantic import BaseModel


class BaseLyricsResponse(BaseModel):
    provider: str
    publicId: str
    lines: list[str]
