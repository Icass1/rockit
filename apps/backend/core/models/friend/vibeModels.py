from pydantic import BaseModel


class VibeResult(BaseModel):
    score: int
    descriptor: str
    sharedArtistsCount: int
