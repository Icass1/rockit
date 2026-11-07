from pydantic import BaseModel, Field


class PinNavigationRequest(BaseModel):
    publicId: str = Field(min_length=1, max_length=128)
