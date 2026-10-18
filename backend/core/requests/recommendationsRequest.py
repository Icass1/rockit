from pydantic import BaseModel, Field


class RecommendationsRequest(BaseModel):
    limit: int = Field(default=20, ge=1, le=50)
    externalUsername: str = Field(default="", max_length=64)
    currentPublicId: str | None = Field(default=None, max_length=128)
