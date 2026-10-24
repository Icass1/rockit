from pydantic import BaseModel, Field


class RecommendationTrackRequest(BaseModel):
    artist: str = Field(min_length=1, max_length=300)
    track: str = Field(min_length=1, max_length=300)


class PrepareRecommendationsRequest(BaseModel):
    publicIds: list[str] = Field(default_factory=lambda: list[str](), max_length=2)
    discover: list[RecommendationTrackRequest] = Field(
        default_factory=lambda: list[RecommendationTrackRequest](), max_length=2
    )
