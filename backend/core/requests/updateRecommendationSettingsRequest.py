from pydantic import BaseModel


class UpdateRecommendationSettingsRequest(BaseModel):
    # Opt in to external suggestions (ListenBrainz / Last.fm). Off by default.
    externalEnabled: bool
    # Public ListenBrainz username; null or "" clears it. No token needed.
    listenbrainzUsername: str | None = None
