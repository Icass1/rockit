from typing import List, Any, Optional
from pydantic import BaseModel


class PlaylistExternalUrls(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistImages(BaseModel):
    url: Optional[str] = None
    height: Optional[int] = None
    width: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistImages':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls1(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistOwner(BaseModel):
    external_urls: Optional[PlaylistExternalUrls1] = None
    href: Optional[str] = None
    id: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    display_name: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistOwner':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls2(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls2':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistAddedBy(BaseModel):
    external_urls: Optional[PlaylistExternalUrls2] = None
    href: Optional[str] = None
    id: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistAddedBy':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls3(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls3':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistImages1(BaseModel):
    url: Optional[str] = None
    height: Optional[int] = None
    width: Optional[int] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistImages1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistRestrictions(BaseModel):
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistRestrictions':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls4(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls4':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistArtists(BaseModel):
    external_urls: Optional[PlaylistExternalUrls4] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistArtists':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistAlbum(BaseModel):
    album_type: Optional[str] = None
    total_tracks: Optional[int] = None
    available_markets: Optional[List[str]] = None
    external_urls: Optional[PlaylistExternalUrls3] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[PlaylistImages1]] = None
    name: Optional[str] = None
    release_date: Optional[str] = None
    release_date_precision: Optional[str] = None
    restrictions: Optional[PlaylistRestrictions] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    artists: Optional[List[PlaylistArtists]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistAlbum':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls5(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls5':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistArtists1(BaseModel):
    external_urls: Optional[PlaylistExternalUrls5] = None
    href: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistArtists1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalIds(BaseModel):
    isrc: Optional[str] = None
    ean: Optional[str] = None
    upc: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalIds':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistExternalUrls6(BaseModel):
    spotify: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistExternalUrls6':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistLinkedFrom(BaseModel):
    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistLinkedFrom':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistRestrictions1(BaseModel):
    reason: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistRestrictions1':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistTrack(BaseModel):
    album: Optional[PlaylistAlbum] = None
    artists: Optional[List[PlaylistArtists1]] = None
    available_markets: Optional[List[str]] = None
    disc_number: Optional[int] = None
    duration_ms: Optional[int] = None
    explicit: Optional[bool] = None
    external_ids: Optional[PlaylistExternalIds] = None
    external_urls: Optional[PlaylistExternalUrls6] = None
    href: Optional[str] = None
    id: Optional[str] = None
    is_playable: Optional[bool] = None
    linked_from: Optional[PlaylistLinkedFrom] = None
    restrictions: Optional[PlaylistRestrictions1] = None
    name: Optional[str] = None
    popularity: Optional[int] = None
    preview_url: Optional[str] = None
    track_number: Optional[int] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    is_local: Optional[bool] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistTrack':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistItems(BaseModel):
    added_at: Optional[str] = None
    added_by: Optional[PlaylistAddedBy] = None
    is_local: Optional[bool] = None
    track: Optional[PlaylistTrack] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistItems':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class PlaylistTracks(BaseModel):
    href: Optional[str] = None
    limit: Optional[int] = None
    next: Optional[str] = None
    offset: Optional[int] = None
    previous: Optional[str] = None
    total: Optional[int] = None
    items: Optional[List[PlaylistItems]] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'PlaylistTracks':
        """Parse from a raw Spotify API dictionary."""

        return cls.model_validate(obj)


class RawSpotifyApiPlaylist(BaseModel):
    collaborative: Optional[bool] = None
    description: Optional[str] = None
    external_urls: Optional[PlaylistExternalUrls] = None
    href: Optional[str] = None
    id: Optional[str] = None
    images: Optional[List[PlaylistImages]] = None
    name: Optional[str] = None
    owner: Optional[PlaylistOwner] = None
    public: Optional[bool] = None
    snapshot_id: Optional[str] = None
    tracks: Optional[PlaylistTracks] = None
    type: Optional[str] = None
    uri: Optional[str] = None

    @classmethod
    def from_dict(cls, obj: Any) -> 'RawSpotifyApiPlaylist':
        """Parse a raw Spotify API playlist response from a dictionary."""

        return cls.model_validate(obj)
