from pydantic import BaseModel

from spotify.spotifyApiTypes.rawSpotifyApiImage import RawSpotifyApiImage


class PlaylistExternalUrls(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls1(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistOwner(BaseModel):
    external_urls: PlaylistExternalUrls1 | None = None
    href: str | None = None
    id: str | None = None
    type: str | None = None
    uri: str | None = None
    display_name: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistOwner":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls2(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistAddedBy(BaseModel):
    external_urls: PlaylistExternalUrls2 | None = None
    href: str | None = None
    id: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistAddedBy":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls3(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistImages1(BaseModel):
    url: str | None = None
    height: int | None = None
    width: int | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistImages1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistRestrictions(BaseModel):
    reason: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistRestrictions":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls4(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls4":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistArtists(BaseModel):
    external_urls: PlaylistExternalUrls4 | None = None
    href: str | None = None
    id: str | None = None
    name: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistArtists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistAlbum(BaseModel):
    album_type: str | None = None
    total_tracks: int | None = None
    available_markets: list[str] | None = None
    external_urls: PlaylistExternalUrls3 | None = None
    href: str | None = None
    id: str | None = None
    images: list[PlaylistImages1] | None = None
    name: str | None = None
    release_date: str | None = None
    release_date_precision: str | None = None
    restrictions: PlaylistRestrictions | None = None
    type: str | None = None
    uri: str | None = None
    artists: list[PlaylistArtists] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistAlbum":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls5(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls5":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistArtists1(BaseModel):
    external_urls: PlaylistExternalUrls5 | None = None
    href: str | None = None
    id: str | None = None
    name: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistArtists1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalIds(BaseModel):
    isrc: str | None = None
    ean: str | None = None
    upc: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalIds":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls6(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistExternalUrls6":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistLinkedFrom(BaseModel):
    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistLinkedFrom":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistRestrictions1(BaseModel):
    reason: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistRestrictions1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistTrack(BaseModel):
    album: PlaylistAlbum | None = None
    artists: list[PlaylistArtists1] | None = None
    available_markets: list[str] | None = None
    disc_number: int | None = None
    duration_ms: int | None = None
    explicit: bool | None = None
    external_ids: PlaylistExternalIds | None = None
    external_urls: PlaylistExternalUrls6 | None = None
    href: str | None = None
    id: str | None = None
    is_playable: bool | None = None
    linked_from: PlaylistLinkedFrom | None = None
    restrictions: PlaylistRestrictions1 | None = None
    name: str | None = None
    popularity: int | None = None
    preview_url: str | None = None
    track_number: int | None = None
    type: str | None = None
    uri: str | None = None
    is_local: bool | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistTrack":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistItems(BaseModel):
    added_at: str | None = None
    added_by: PlaylistAddedBy | None = None
    is_local: bool | None = None
    track: PlaylistTrack | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistItems":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistTracks(BaseModel):
    href: str | None = None
    limit: int | None = None
    next: str | None = None
    offset: int | None = None
    previous: str | None = None
    total: int | None = None
    items: list[PlaylistItems] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "PlaylistTracks":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiPlaylist(BaseModel):
    collaborative: bool | None = None
    description: str | None = None
    external_urls: PlaylistExternalUrls | None = None
    href: str | None = None
    id: str
    images: list[RawSpotifyApiImage]
    name: str
    owner: PlaylistOwner | None = None
    public: bool | None = None
    snapshot_id: str | None = None
    tracks: PlaylistTracks
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "RawSpotifyApiPlaylist":
        """Parse a raw Spotify API playlist response from a dictionary."""

        return cls.model_validate(obj)
