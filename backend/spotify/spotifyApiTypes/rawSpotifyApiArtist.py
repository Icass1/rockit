from typing import List, Any, Optional
from pydantic import BaseModel

from backend.spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class ArtistExternalUrls(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'ArtistExternalUrls':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class ArtistFollowers(BaseModel):
    href: Optional[Any] = None
    total: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'ArtistFollowers':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiArtist(BaseModel):
    external_urls: Optional[ArtistExternalUrls] = None
    followers: Optional[ArtistFollowers] = None
    genres: Optional[List[str]] = None
    href: Optional[str] = None
    id: str
    images: List[RawSpotifyApiImage]
    name: Optional[str] = None
    popularity: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'RawSpotifyApiArtist':
        """Parse a raw Spotify API artist response from a dictionary."""

        return cls.model_validate(obj)
