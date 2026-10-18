from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


@dataclass(frozen=True)
class RecommendationCandidate:
    """Bounded database projection; API results use the existing song response."""

    public_id: str
    name: str
    artists: tuple[str, ...] = ()
    album: str = ""
    playable: bool = True
    liked: bool = False
    in_library: bool = False
    plays: int = 0
    last_played: datetime | None = None
    current: bool = False


# The two documented ListenBrainz JSPF envelopes are validated before use.


class ListenBrainzPlaylistReference(BaseModel):
    identifier: str
    date: str = ""


class ListenBrainzPlaylistEnvelope(BaseModel):
    playlist: ListenBrainzPlaylistReference


class ListenBrainzPlaylistListing(BaseModel):
    playlists: list[ListenBrainzPlaylistEnvelope]


class ListenBrainzTrack(BaseModel):
    model_config = ConfigDict(strict=True)
    title: str = Field(min_length=1, max_length=500)
    creator: str = Field(min_length=1, max_length=500)


class ListenBrainzPlaylistTracks(BaseModel):
    track: list[object]


class ListenBrainzPlaylistDocument(BaseModel):
    playlist: ListenBrainzPlaylistTracks
