from typing import List
from pydantic import BaseModel


class RecommendationSettingsResponse(BaseModel):
    externalEnabled: bool
    listenbrainzUsername: str | None
    # External providers this instance has configured, in the order they are
    # tried (e.g. ["ListenBrainz", "Last.fm"]).
    availableProviders: List[str]
