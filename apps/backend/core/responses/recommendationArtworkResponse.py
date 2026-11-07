from pydantic import BaseModel


class RecommendationArtworkResponse(BaseModel):
    imageUrl: str | None = None
