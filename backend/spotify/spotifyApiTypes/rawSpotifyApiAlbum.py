from typing import List, Any, Optional
from pydantic import BaseModel

from backend.spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class AlbumExternalUrls(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalUrls':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumRestrictions(BaseModel):
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumRestrictions':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls1(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalUrls1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumArtists(BaseModel):
    external_urls: Optional[AlbumExternalUrls1] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumArtists':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls2(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalUrls2':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumArtists1(BaseModel):
    external_urls: Optional[AlbumExternalUrls2] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumArtists1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls3(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalUrls3':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls4(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalUrls4':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumLinkedFrom(BaseModel):
    external_urls: Optional[AlbumExternalUrls4] = None
    href: Optional[str] = None
    id: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumLinkedFrom':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumItems(BaseModel):
    artists: Optional[List[AlbumArtists1]] = None
    available_markets: Optional[List[str]] = None
    disc_number: Optional[int] = None
    duration_ms: Optional[int] = None
    explicit: Optional[bool] = None
    external_urls: Optional[AlbumExternalUrls3] = None
    href: Optional[str] = None
    id: Optional[str] = None
    is_playable: Optional[bool] = None
    linked_from: Optional[AlbumLinkedFrom] = None
    restrictions: Optional[AlbumRestrictions] = None
    name: Optional[str] = None
    preview_url: Optional[str] = None
    track_number: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    is_local: Optional[bool] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumItems':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumTracks(BaseModel):
    href: str
    limit: int
    next: str | None
    offset: int
    previous: str | None
    total: int
    items: List[AlbumItems]

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumTracks':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumCopyrights(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumCopyrights':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalIds(BaseModel):
    isrc: Optional[str] = None
    ean: Optional[str] = None
    upc: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalIds':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiAlbum(BaseModel):
    album_type: str
    total_tracks: int
    available_markets: List[str]
    external_urls: AlbumExternalUrls
    href: str
    id: str
    images: List[RawSpotifyApiImage]
    name: str
    release_date: str
    release_date_precision: str
    restrictions: Optional[AlbumRestrictions] = None # Field can be missing.
    type: str
    uri: str
    artists: List[AlbumArtists]
    tracks: AlbumTracks
    copyrights: List[AlbumCopyrights]
    external_ids: AlbumExternalIds
    genres: List[Any]
    label: str
    popularity: int

    @classmethod
    def from_dict(cls, obj: Any) -> 'RawSpotifyApiAlbum':
        """Parse a raw Spotify API album response from a dictionary."""

        return cls.model_validate(obj)
