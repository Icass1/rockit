from pydantic import BaseModel, Field


class ListeningHeatmapSegment(BaseModel):
    startMs: int
    endMs: int
    count: int


class ListeningHeatmapResponse(BaseModel):
    segments: list[ListeningHeatmapSegment] = Field(default_factory=list[ListeningHeatmapSegment])
