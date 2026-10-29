from typing import Any

from pydantic import BaseModel

from spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class AlbumExternalUrls(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumExternalUrls":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumRestrictions(BaseModel):
    reason: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumRestrictions":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls1(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumExternalUrls1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumArtists(BaseModel):
    external_urls: AlbumExternalUrls1 | None = None
    href: str | None = None
    id: str | None = None
    name: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumArtists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls2(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumExternalUrls2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumArtists1(BaseModel):
    external_urls: AlbumExternalUrls2 | None = None
    href: str | None = None
    id: str | None = None
    name: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumArtists1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls3(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumExternalUrls3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalUrls4(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumExternalUrls4":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumLinkedFrom(BaseModel):
    external_urls: AlbumExternalUrls4 | None = None
    href: str | None = None
    id: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumLinkedFrom":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumItems(BaseModel):
    artists: list[AlbumArtists1] | None = None
    available_markets: list[str] | None = None
    disc_number: int | None = None
    duration_ms: int | None = None
    explicit: bool | None = None
    external_urls: AlbumExternalUrls3 | None = None
    href: str | None = None
    id: str | None = None
    is_playable: bool | None = None
    linked_from: AlbumLinkedFrom | None = None
    restrictions: AlbumRestrictions | None = None
    name: str | None = None
    preview_url: str | None = None
    track_number: int | None = None
    type: str | None = None
    uri: str | None = None
    is_local: bool | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumItems":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumTracks(BaseModel):
    href: str
    limit: int
    next: str | None
    offset: int
    previous: str | None
    total: int
    items: list[AlbumItems]

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumTracks":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumCopyrights(BaseModel):
    text: str | None = None
    type: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumCopyrights":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class AlbumExternalIds(BaseModel):
    isrc: str | None = None
    ean: str | None = None
    upc: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "AlbumExternalIds":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiAlbum(BaseModel):
    album_type: str
    total_tracks: int
    available_markets: list[str]
    external_urls: AlbumExternalUrls
    href: str
    id: str
    images: list[RawSpotifyApiImage]
    name: str
    release_date: str
    release_date_precision: str
    restrictions: AlbumRestrictions | None = None  # Field can be missing.
    type: str
    uri: str
    artists: list[AlbumArtists]
    tracks: AlbumTracks
    copyrights: list[AlbumCopyrights]
    external_ids: AlbumExternalIds
    genres: list[Any]
    label: str
    popularity: int

    @classmethod
    def from_dict(cls, obj: object) -> "RawSpotifyApiAlbum":
        """Parse a raw Spotify API album response from a dictionary."""

        return cls.model_validate(obj)
