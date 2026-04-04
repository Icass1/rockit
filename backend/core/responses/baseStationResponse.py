from typing import Literal

from pydantic import BaseModel


class BaseStationResponse(BaseModel):
    """Base response model for a station information."""

    type: Literal["station"] = "station"
    provider: str
    publicId: str
    providerUrl: str
    name: str
    imageUrl: str
