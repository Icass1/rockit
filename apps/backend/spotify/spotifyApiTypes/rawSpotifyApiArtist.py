from typing import Any

from pydantic import BaseModel

from spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class ArtistExternalUrls(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "ArtistExternalUrls":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class ArtistFollowers(BaseModel):
    href: Any | None = None
    total: int | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "ArtistFollowers":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiArtist(BaseModel):
    external_urls: ArtistExternalUrls | None = None
    followers: ArtistFollowers | None = None
    genres: list[str] | None = None
    href: str | None = None
    id: str
    images: list[RawSpotifyApiImage]
    name: str | None = None
    popularity: int | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "RawSpotifyApiArtist":
        """Parse a raw Spotify API artist response from a dictionary."""

        return cls.model_validate(obj)
