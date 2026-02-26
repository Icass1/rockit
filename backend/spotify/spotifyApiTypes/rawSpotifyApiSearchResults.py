from typing import List, Any, Optional
from pydantic import BaseModel


class SpotifySearchResultsExternalUrls(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists(BaseModel):
    external_urls: Optional[SpotifySearchResultsExternalUrls] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsArtists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls1(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages(BaseModel):
    height: Optional[int] = None
    width: Optional[int] = None
    url: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsImages":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsAlbum(BaseModel):
    album_type: Optional[str] = None
    artists: Optional[List[SpotifySearchResultsArtists]] = None
    available_markets: Optional[List[str]] = None
    external_urls: Optional[SpotifySearchResultsExternalUrls1] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[SpotifySearchResultsImages]] = None
    is_playable: Optional[bool] = None
    name: Optional[str] = None
    release_date: Optional[str] = None
    release_date_precision: Optional[str] = None
    total_tracks: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsAlbum":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls2(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists1(BaseModel):
    external_urls: Optional[SpotifySearchResultsExternalUrls2] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: str
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsArtists1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalIds(BaseModel):
    isrc: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalIds":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls3(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems(BaseModel):
    album: Optional[SpotifySearchResultsAlbum] = None
    artists: List[SpotifySearchResultsArtists1]
    available_markets: Optional[List[str]] = None
    disc_number: Optional[int] = None
    duration_ms: Optional[int] = None
    explicit: Optional[bool] = None
    external_ids: Optional[SpotifySearchResultsExternalIds] = None
    external_urls: Optional[SpotifySearchResultsExternalUrls3] = None
    href: Optional[str] = None
    id: Optional[str] = None
    is_local: Optional[bool] = None
    is_playable: Optional[bool] = None
    name: Optional[str] = None
    popularity: Optional[int] = None
    preview_url: Optional[Any] = None
    track_number: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsItems":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsTracks(BaseModel):
    href: Optional[str] = None
    limit: Optional[int] = None
    next: Optional[str] = None
    offset: Optional[int] = None
    previous: Optional[Any] = None
    total: Optional[int] = None
    items: Optional[List[SpotifySearchResultsItems]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsTracks":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls4(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls4":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsFollowers(BaseModel):
    href: Optional[Any] = None
    total: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsFollowers":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages1(BaseModel):
    url: Optional[str] = None
    height: Optional[int] = None
    width: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsImages1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems1(BaseModel):
    external_urls: Optional[SpotifySearchResultsExternalUrls4] = None
    followers: Optional[SpotifySearchResultsFollowers] = None
    genres: Optional[List[str]] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[SpotifySearchResultsImages1]] = None
    name: Optional[str] = None
    popularity: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsItems1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists2(BaseModel):
    href: Optional[str] = None
    limit: Optional[int] = None
    next: Optional[str] = None
    offset: Optional[int] = None
    previous: Optional[Any] = None
    total: Optional[int] = None
    items: Optional[List[SpotifySearchResultsItems1]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsArtists2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls5(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls5":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages2(BaseModel):
    height: Optional[int] = None
    url: Optional[str] = None
    width: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsImages2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls6(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls6":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsArtists3(BaseModel):
    external_urls: Optional[SpotifySearchResultsExternalUrls6] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: str
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsArtists3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems2(BaseModel):
    album_type: Optional[str] = None
    total_tracks: Optional[int] = None
    available_markets: Optional[List[str]] = None
    external_urls: Optional[SpotifySearchResultsExternalUrls5] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[SpotifySearchResultsImages2]] = None
    name: Optional[str] = None
    release_date: Optional[str] = None
    release_date_precision: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    artists: List[SpotifySearchResultsArtists3]

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsItems2":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsAlbums(BaseModel):
    href: Optional[str] = None
    limit: Optional[int] = None
    next: Optional[str] = None
    offset: Optional[int] = None
    previous: Optional[Any] = None
    total: Optional[int] = None
    items: Optional[List[SpotifySearchResultsItems2]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsAlbums":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls7(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls7":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsImages3(BaseModel):
    height: Optional[Any] = None
    url: Optional[str] = None
    width: Optional[Any] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsImages3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsExternalUrls8(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsExternalUrls8":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsOwner(BaseModel):
    display_name: str
    external_urls: Optional[SpotifySearchResultsExternalUrls8] = None
    href: Optional[str] = None
    id: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsOwner":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsTracks1(BaseModel):
    href: Optional[str] = None
    total: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsTracks1":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsItems3(BaseModel):
    collaborative: Optional[bool] = None
    description: Optional[str] = None
    external_urls: Optional[SpotifySearchResultsExternalUrls7] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[SpotifySearchResultsImages3]] = None
    name: str
    owner: SpotifySearchResultsOwner
    primary_color: Optional[Any] = None
    public: Optional[bool] = None
    snapshot_id: Optional[str] = None
    tracks: Optional[SpotifySearchResultsTracks1] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsItems3":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class SpotifySearchResultsPlaylists(BaseModel):
    href: Optional[str] = None
    limit: Optional[int] = None
    next: Optional[str] = None
    offset: Optional[int] = None
    previous: Optional[Any] = None
    total: Optional[int] = None
    items: List[Optional[SpotifySearchResultsItems3]]

    @classmethod
    def from_dict(cls, obj: Any) -> "SpotifySearchResultsPlaylists":
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiSearchResults(BaseModel):
    tracks: Optional[SpotifySearchResultsTracks] = None
    artists: Optional[SpotifySearchResultsArtists2] = None
    albums: Optional[SpotifySearchResultsAlbums] = None
    playlists: Optional[SpotifySearchResultsPlaylists] = None

    @classmethod
    def from_dict(cls, obj: Any) -> "RawSpotifyApiSearchResults":
        """Parse a raw Spotify API search results response from a dictionary."""

        return cls.model_validate(obj)
