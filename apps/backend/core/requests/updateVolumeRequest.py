from pydantic import BaseModel, Field


class UpdateVolumeRequest(BaseModel):
    volume: float = Field(ge=0, le=1, allow_inf_nan=False)
