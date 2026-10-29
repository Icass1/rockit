from pydantic import BaseModel

from spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class TrackExternalUrls(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackExternalUrls":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackRestrictions(BaseModel):
    reason: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackRestrictions":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalUrls1(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackExternalUrls1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackArtists(BaseModel):
    external_urls: TrackExternalUrls1 | None = None
    href: str | None = None
    id: str | None = None
    name: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackArtists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackAlbum(BaseModel):
    album_type: str | None = None
    total_tracks: int | None = None
    available_markets: list[str] | None = None
    external_urls: TrackExternalUrls | None = None
    href: str | None = None
    id: str
    images: list[RawSpotifyApiImage]
    name: str | None = None
    release_date: str | None = None
    release_date_precision: str | None = None
    restrictions: TrackRestrictions | None = None
    type: str | None = None
    uri: str | None = None
    artists: list[TrackArtists] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackAlbum":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalUrls2(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackExternalUrls2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalIds(BaseModel):
    isrc: str | None = None
    ean: str | None = None
    upc: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackExternalIds":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackExternalUrls3(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackExternalUrls3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackLinkedFrom(BaseModel):
    @classmethod
    def from_dict(cls, obj: object) -> "TrackLinkedFrom":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class TrackRestrictions1(BaseModel):
    reason: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "TrackRestrictions1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiTrack(BaseModel):
    album: TrackAlbum
    artists: list[TrackArtists] | None = None
    available_markets: list[str] | None = None
    disc_number: int | None = None
    duration_ms: int | None = None
    explicit: bool | None = None
    external_ids: TrackExternalIds | None = None
    external_urls: TrackExternalUrls3 | None = None
    href: str | None = None
    id: str
    is_playable: bool | None = None
    linked_from: TrackLinkedFrom | None = None
    restrictions: TrackRestrictions1 | None = None
    name: str
    popularity: int | None = None
    preview_url: str | None = None
    track_number: int | None = None
    type: str | None = None
    uri: str | None = None
    is_local: bool | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "RawSpotifyApiTrack":
        """Parse a raw Spotify API track response from a dictionary."""

        return cls.model_validate(obj)
