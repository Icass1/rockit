from typing import Any

from pydantic import BaseModel


class SpotifySearchResultsExternalUrls(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists(BaseModel):
    external_urls: SpotifySearchResultsExternalUrls | None = None
    href: str | None = None
    id: str | None = None
    name: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsArtists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls1(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages(BaseModel):
    height: int | None = None
    width: int | None = None
    url: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsImages":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsAlbum(BaseModel):
    album_type: str | None = None
    artists: list[SpotifySearchResultsArtists] | None = None
    available_markets: list[str] | None = None
    external_urls: SpotifySearchResultsExternalUrls1 | None = None
    href: str | None = None
    id: str | None = None
    images: list[SpotifySearchResultsImages] | None = None
    is_playable: bool | None = None
    name: str | None = None
    release_date: str | None = None
    release_date_precision: str | None = None
    total_tracks: int | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsAlbum":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls2(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists1(BaseModel):
    external_urls: SpotifySearchResultsExternalUrls2 | None = None
    href: str | None = None
    id: str | None = None
    name: str
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsArtists1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalIds(BaseModel):
    isrc: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalIds":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls3(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems(BaseModel):
    album: SpotifySearchResultsAlbum | None = None
    artists: list[SpotifySearchResultsArtists1]
    available_markets: list[str] | None = None
    disc_number: int | None = None
    duration_ms: int | None = None
    explicit: bool | None = None
    external_ids: SpotifySearchResultsExternalIds | None = None
    external_urls: SpotifySearchResultsExternalUrls3 | None = None
    href: str | None = None
    id: str | None = None
    is_local: bool | None = None
    is_playable: bool | None = None
    name: str | None = None
    popularity: int | None = None
    preview_url: Any | None = None
    track_number: int | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsItems":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsTracks(BaseModel):
    href: str | None = None
    limit: int | None = None
    next: str | None = None
    offset: int | None = None
    previous: Any | None = None
    total: int | None = None
    items: list[SpotifySearchResultsItems] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsTracks":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls4(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls4":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsFollowers(BaseModel):
    href: Any | None = None
    total: int | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsFollowers":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages1(BaseModel):
    url: str | None = None
    height: int | None = None
    width: int | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsImages1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems1(BaseModel):
    external_urls: SpotifySearchResultsExternalUrls4 | None = None
    followers: SpotifySearchResultsFollowers | None = None
    genres: list[str] | None = None
    href: str | None = None
    id: str | None = None
    images: list[SpotifySearchResultsImages1] | None = None
    name: str | None = None
    popularity: int | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsItems1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists2(BaseModel):
    href: str | None = None
    limit: int | None = None
    next: str | None = None
    offset: int | None = None
    previous: Any | None = None
    total: int | None = None
    items: list[SpotifySearchResultsItems1] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsArtists2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls5(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls5":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages2(BaseModel):
    height: int | None = None
    url: str | None = None
    width: int | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsImages2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls6(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls6":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists3(BaseModel):
    external_urls: SpotifySearchResultsExternalUrls6 | None = None
    href: str | None = None
    id: str | None = None
    name: str
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsArtists3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems2(BaseModel):
    album_type: str | None = None
    total_tracks: int | None = None
    available_markets: list[str] | None = None
    external_urls: SpotifySearchResultsExternalUrls5 | None = None
    href: str | None = None
    id: str | None = None
    images: list[SpotifySearchResultsImages2] | None = None
    name: str | None = None
    release_date: str | None = None
    release_date_precision: str | None = None
    type: str | None = None
    uri: str | None = None
    artists: list[SpotifySearchResultsArtists3]

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsItems2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsAlbums(BaseModel):
    href: str | None = None
    limit: int | None = None
    next: str | None = None
    offset: int | None = None
    previous: Any | None = None
    total: int | None = None
    items: list[SpotifySearchResultsItems2] | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsAlbums":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls7(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls7":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages3(BaseModel):
    height: Any | None = None
    url: str | None = None
    width: Any | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsImages3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls8(BaseModel):
    spotify: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsExternalUrls8":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsOwner(BaseModel):
    display_name: str
    external_urls: SpotifySearchResultsExternalUrls8 | None = None
    href: str | None = None
    id: str | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsOwner":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsTracks1(BaseModel):
    href: str | None = None
    total: int | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsTracks1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems3(BaseModel):
    collaborative: bool | None = None
    description: str | None = None
    external_urls: SpotifySearchResultsExternalUrls7 | None = None
    href: str | None = None
    id: str | None = None
    images: list[SpotifySearchResultsImages3] | None = None
    name: str
    owner: SpotifySearchResultsOwner
    primary_color: Any | None = None
    public: bool | None = None
    snapshot_id: str | None = None
    tracks: SpotifySearchResultsTracks1 | None = None
    type: str | None = None
    uri: str | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsItems3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsPlaylists(BaseModel):
    href: str | None = None
    limit: int | None = None
    next: str | None = None
    offset: int | None = None
    previous: Any | None = None
    total: int | None = None
    items: list[SpotifySearchResultsItems3 | None]

    @classmethod
    def from_dict(cls, obj: object) -> "SpotifySearchResultsPlaylists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiSearchResults(BaseModel):
    tracks: SpotifySearchResultsTracks | None = None
    artists: SpotifySearchResultsArtists2 | None = None
    albums: SpotifySearchResultsAlbums | None = None
    playlists: SpotifySearchResultsPlaylists | None = None

    @classmethod
    def from_dict(cls, obj: object) -> "RawSpotifyApiSearchResults":
        """Parse a raw Spotify API search results response from a dictionary."""

        return cls.model_validate(obj)
