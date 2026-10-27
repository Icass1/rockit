from pydantic import BaseModel


class GetLyricsBatchRequest(BaseModel):
    publicIds: list[str]


class UpdateTimestampItem(BaseModel):
    line: int
    timestamp_s: float


class UpdateTimestampsRequest(BaseModel):
    timestamps: list[UpdateTimestampItem]
