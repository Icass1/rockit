from typing import List, Any, Optional
from pydantic import BaseModel


class AlbumExternalUrls(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumExternalUrls':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumImages(BaseModel):
    url: Optional[str] = None
    height: Optional[int] = None
    width: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumImages':
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


class AlbumRestrictions1(BaseModel):
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'AlbumRestrictions1':
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
    restrictions: Optional[AlbumRestrictions1] = None
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
    href: Optional[str] = None
    limit: Optional[int] = None
    next: Optional[str] = None
    offset: Optional[int] = None
    previous: Optional[str] = None
    total: Optional[int] = None
    items: Optional[List[AlbumItems]] = None

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
    album_type: Optional[str] = None
    total_tracks: Optional[int] = None
    available_markets: Optional[List[str]] = None
    external_urls: Optional[AlbumExternalUrls] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[AlbumImages]] = None
    name: Optional[str] = None
    release_date: Optional[str] = None
    release_date_precision: Optional[str] = None
    restrictions: Optional[AlbumRestrictions] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    artists: Optional[List[AlbumArtists]] = None
    tracks: Optional[AlbumTracks] = None
    copyrights: Optional[List[AlbumCopyrights]] = None
    external_ids: Optional[AlbumExternalIds] = None
    genres: Optional[List[Any]] = None
    label: Optional[str] = None
    popularity: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'RawSpotifyApiAlbum':
        """Parse a raw Spotify API album response from a dictionary."""

        return cls.model_validate(obj)
