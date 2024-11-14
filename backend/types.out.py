from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class PlaylistExternalUrls:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls(_spotify)

@dataclass
class PlaylistFollowers:
    href: str
    total: int
    def from_dict(obj: Any) -> 'PlaylistFollowers':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return PlaylistFollowers(_href, _total)

@dataclass
class PlaylistImages:
    url: str
    height: int
    width: int
    def from_dict(obj: Any) -> 'PlaylistImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return PlaylistImages(_url, _height, _width)

@dataclass
class PlaylistExternalUrls1:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls1':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls1(_spotify)

@dataclass
class PlaylistFollowers1:
    href: str
    total: int
    def from_dict(obj: Any) -> 'PlaylistFollowers1':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return PlaylistFollowers1(_href, _total)

@dataclass
class PlaylistOwner:
    external_urls: PlaylistExternalUrls1
    followers: PlaylistFollowers1
    href: str
    id: str
    type: str
    uri: str
    display_name: str
    def from_dict(obj: Any) -> 'PlaylistOwner':
        _external_urls = PlaylistExternalUrls1.from_dict(obj.get('external_urls'))
        _followers = PlaylistFollowers1.from_dict(obj.get('followers'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _display_name = obj.get('display_name') if obj and 'display_name' in obj else None
        return PlaylistOwner(_external_urls, _followers, _href, _id, _type, _uri, _display_name)

@dataclass
class PlaylistExternalUrls2:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls2':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls2(_spotify)

@dataclass
class PlaylistFollowers2:
    href: str
    total: int
    def from_dict(obj: Any) -> 'PlaylistFollowers2':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return PlaylistFollowers2(_href, _total)

@dataclass
class PlaylistAddedBy:
    external_urls: PlaylistExternalUrls2
    followers: PlaylistFollowers2
    href: str
    id: str
    type: str
    uri: str
    def from_dict(obj: Any) -> 'PlaylistAddedBy':
        _external_urls = PlaylistExternalUrls2.from_dict(obj.get('external_urls'))
        _followers = PlaylistFollowers2.from_dict(obj.get('followers'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return PlaylistAddedBy(_external_urls, _followers, _href, _id, _type, _uri)

@dataclass
class PlaylistExternalUrls3:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls3':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls3(_spotify)

@dataclass
class PlaylistImages:
    url: str
    height: int
    width: int
    def from_dict(obj: Any) -> 'PlaylistImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return PlaylistImages(_url, _height, _width)

@dataclass
class PlaylistRestrictions:
    reason: str
    def from_dict(obj: Any) -> 'PlaylistRestrictions':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return PlaylistRestrictions(_reason)

@dataclass
class PlaylistExternalUrls4:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls4':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls4(_spotify)

@dataclass
class PlaylistArtists:
    external_urls: PlaylistExternalUrls4
    href: str
    id: str
    name: str
    type: str
    uri: str
    def from_dict(obj: Any) -> 'PlaylistArtists':
        _external_urls = PlaylistExternalUrls4.from_dict(obj.get('external_urls'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return PlaylistArtists(_external_urls, _href, _id, _name, _type, _uri)

@dataclass
class PlaylistAlbum:
    album_type: str
    total_tracks: int
    available_markets: List[str]
    external_urls: PlaylistExternalUrls3
    href: str
    id: str
    images: List[PlaylistImages]
    name: str
    release_date: str
    release_date_precision: str
    restrictions: PlaylistRestrictions
    type: str
    uri: str
    artists: List[PlaylistArtists]
    def from_dict(obj: Any) -> 'PlaylistAlbum':
        _album_type = obj.get('album_type') if obj and 'album_type' in obj else None
        _total_tracks = obj.get('total_tracks') if obj and 'total_tracks' in obj else None
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _external_urls = PlaylistExternalUrls3.from_dict(obj.get('external_urls'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [PlaylistImages.from_dict(k) for k in obj.get('images')]
        _name = obj.get('name') if obj and 'name' in obj else None
        _release_date = obj.get('release_date') if obj and 'release_date' in obj else None
        _release_date_precision = obj.get('release_date_precision') if obj and 'release_date_precision' in obj else None
        _restrictions = PlaylistRestrictions.from_dict(obj.get('restrictions'))
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _artists = [PlaylistArtists.from_dict(k) for k in obj.get('artists')]
        return PlaylistAlbum(_album_type, _total_tracks, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _restrictions, _type, _uri, _artists)

@dataclass
class PlaylistExternalUrls5:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls5':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls5(_spotify)

@dataclass
class PlaylistArtists:
    external_urls: PlaylistExternalUrls5
    href: str
    id: str
    name: str
    type: str
    uri: str
    def from_dict(obj: Any) -> 'PlaylistArtists':
        _external_urls = PlaylistExternalUrls5.from_dict(obj.get('external_urls'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return PlaylistArtists(_external_urls, _href, _id, _name, _type, _uri)

@dataclass
class PlaylistExternalIds:
    isrc: str
    ean: str
    upc: str
    def from_dict(obj: Any) -> 'PlaylistExternalIds':
        _isrc = obj.get('isrc') if obj and 'isrc' in obj else None
        _ean = obj.get('ean') if obj and 'ean' in obj else None
        _upc = obj.get('upc') if obj and 'upc' in obj else None
        return PlaylistExternalIds(_isrc, _ean, _upc)

@dataclass
class PlaylistExternalUrls6:
    spotify: str
    def from_dict(obj: Any) -> 'PlaylistExternalUrls6':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls6(_spotify)

@dataclass
class PlaylistLinkedFrom:
    def from_dict(obj: Any) -> 'PlaylistLinkedFrom':
        return PlaylistLinkedFrom()

@dataclass
class PlaylistRestrictions1:
    reason: str
    def from_dict(obj: Any) -> 'PlaylistRestrictions1':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return PlaylistRestrictions1(_reason)

@dataclass
class PlaylistTrack:
    album: PlaylistAlbum
    artists: List[PlaylistArtists]
    available_markets: List[str]
    disc_number: int
    duration_ms: int
    explicit: bool
    external_ids: PlaylistExternalIds
    external_urls: PlaylistExternalUrls6
    href: str
    id: str
    is_playable: bool
    linked_from: PlaylistLinkedFrom
    restrictions: PlaylistRestrictions1
    name: str
    popularity: int
    preview_url: str
    track_number: int
    type: str
    uri: str
    is_local: bool
    def from_dict(obj: Any) -> 'PlaylistTrack':
        _album = PlaylistAlbum.from_dict(obj.get('album'))
        _artists = [PlaylistArtists.from_dict(k) for k in obj.get('artists')]
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _disc_number = obj.get('disc_number') if obj and 'disc_number' in obj else None
        _duration_ms = obj.get('duration_ms') if obj and 'duration_ms' in obj else None
        _explicit = obj.get('explicit') if obj and 'explicit' in obj else None
        _external_ids = PlaylistExternalIds.from_dict(obj.get('external_ids'))
        _external_urls = PlaylistExternalUrls6.from_dict(obj.get('external_urls'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _is_playable = obj.get('is_playable') if obj and 'is_playable' in obj else None
        _linked_from = PlaylistLinkedFrom.from_dict(obj.get('linked_from'))
        _restrictions = PlaylistRestrictions1.from_dict(obj.get('restrictions'))
        _name = obj.get('name') if obj and 'name' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _preview_url = obj.get('preview_url') if obj and 'preview_url' in obj else None
        _track_number = obj.get('track_number') if obj and 'track_number' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _is_local = obj.get('is_local') if obj and 'is_local' in obj else None
        return PlaylistTrack(_album, _artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_ids, _external_urls, _href, _id, _is_playable, _linked_from, _restrictions, _name, _popularity, _preview_url, _track_number, _type, _uri, _is_local)

@dataclass
class PlaylistItems:
    added_at: str
    added_by: PlaylistAddedBy
    is_local: bool
    track: PlaylistTrack
    def from_dict(obj: Any) -> 'PlaylistItems':
        _added_at = obj.get('added_at') if obj and 'added_at' in obj else None
        _added_by = PlaylistAddedBy.from_dict(obj.get('added_by'))
        _is_local = obj.get('is_local') if obj and 'is_local' in obj else None
        _track = PlaylistTrack.from_dict(obj.get('track'))
        return PlaylistItems(_added_at, _added_by, _is_local, _track)

@dataclass
class PlaylistTracks:
    href: str
    limit: int
    next: str
    offset: int
    previous: str
    total: int
    items: List[PlaylistItems]
    def from_dict(obj: Any) -> 'PlaylistTracks':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [PlaylistItems.from_dict(k) for k in obj.get('items')]
        return PlaylistTracks(_href, _limit, _next, _offset, _previous, _total, _items)

@dataclass
class RawSpotifyApiPlaylist:
    collaborative: bool
    description: str
    external_urls: PlaylistExternalUrls
    followers: PlaylistFollowers
    href: str
    id: str
    images: List[PlaylistImages]
    name: str
    owner: PlaylistOwner
    public: bool
    snapshot_id: str
    tracks: PlaylistTracks
    type: str
    uri: str
    def from_dict(obj: Any) -> 'RawSpotifyApiPlaylist':
        _collaborative = obj.get('collaborative') if obj and 'collaborative' in obj else None
        _description = obj.get('description') if obj and 'description' in obj else None
        _external_urls = PlaylistExternalUrls.from_dict(obj.get('external_urls'))
        _followers = PlaylistFollowers.from_dict(obj.get('followers'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [PlaylistImages.from_dict(k) for k in obj.get('images')]
        _name = obj.get('name') if obj and 'name' in obj else None
        _owner = PlaylistOwner.from_dict(obj.get('owner'))
        _public = obj.get('public') if obj and 'public' in obj else None
        _snapshot_id = obj.get('snapshot_id') if obj and 'snapshot_id' in obj else None
        _tracks = PlaylistTracks.from_dict(obj.get('tracks'))
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return RawSpotifyApiPlaylist(_collaborative, _description, _external_urls, _followers, _href, _id, _images, _name, _owner, _public, _snapshot_id, _tracks, _type, _uri)

