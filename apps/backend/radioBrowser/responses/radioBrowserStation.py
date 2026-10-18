from pydantic import BaseModel
from typing import Optional


class RadioBrowserStationResponse(BaseModel):
    """Pydantic DTO for a Radio Browser API station response."""

    stationuuid: str
    name: str
    url: str
    url_resolved: str | None = None
    favicon: str
    homepage: str | None = None
    country: str | None = None
    countrycode: str | None = None
    state: str | None = None
    language: str | None = None
    languagecodes: str | None = None
    codec: str | None = None
    bitrate: int | None = None
    tags: str | None = None
    votes: int | None = None
    geo_lat: Optional[float] = None
    geo_long: Optional[float] = None
