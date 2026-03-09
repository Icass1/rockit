from pydantic import BaseModel


class BaseStationResponse(BaseModel):
    """Base response model for a station information."""

    provider: str
    publicId: str
    url: str
