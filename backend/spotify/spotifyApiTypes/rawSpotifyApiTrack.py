from typing import List, Any, Optional
from pydantic import BaseModel

from backend.spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class TrackExternalUrls(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackExternalUrls':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackRestrictions(BaseModel):
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackRestrictions':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalUrls1(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackExternalUrls1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackArtists(BaseModel):
    external_urls: Optional[TrackExternalUrls1] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackArtists':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackAlbum(BaseModel):
    album_type: Optional[str] = None
    total_tracks: Optional[int] = None
    available_markets: Optional[List[str]] = None
    external_urls: Optional[TrackExternalUrls] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: List[RawSpotifyApiImage]
    name: Optional[str] = None
    release_date: Optional[str] = None
    release_date_precision: Optional[str] = None
    restrictions: Optional[TrackRestrictions] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    artists: Optional[List[TrackArtists]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackAlbum':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalUrls2(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackExternalUrls2':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalIds(BaseModel):
    isrc: Optional[str] = None
    ean: Optional[str] = None
    upc: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackExternalIds':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalUrls3(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackExternalUrls3':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackLinkedFrom(BaseModel):
    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackLinkedFrom':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackRestrictions1(BaseModel):
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'TrackRestrictions1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiTrack(BaseModel):
    album: Optional[TrackAlbum] = None
    artists: Optional[List[TrackArtists]] = None
    available_markets: Optional[List[str]] = None
    disc_number: Optional[int] = None
    duration_ms: Optional[int] = None
    explicit: Optional[bool] = None
    external_ids: Optional[TrackExternalIds] = None
    external_urls: Optional[TrackExternalUrls3] = None
    href: Optional[str] = None
    id: str
    is_playable: Optional[bool] = None
    linked_from: Optional[TrackLinkedFrom] = None
    restrictions: Optional[TrackRestrictions1] = None
    name: Optional[str] = None
    popularity: Optional[int] = None
    preview_url: Optional[str] = None
    track_number: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    is_local: Optional[bool] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'RawSpotifyApiTrack':
        """Parse a raw Spotify API track response from a dictionary."""

        return cls.model_validate(obj)
