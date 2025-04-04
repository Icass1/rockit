from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class PlaylistExternalUrls:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistFollowers:
    href: str
    total: int
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistFollowers':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return PlaylistFollowers(_href, _total, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'total':
            return self.total
        return None

@dataclass
class PlaylistImages:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return PlaylistImages(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class PlaylistExternalUrls1:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls1':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls1(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistFollowers1:
    href: str
    total: int
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistFollowers1':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return PlaylistFollowers1(_href, _total, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'total':
            return self.total
        return None

@dataclass
class PlaylistOwner:
    external_urls: PlaylistExternalUrls1
    followers: PlaylistFollowers1
    href: str
    id: str
    type: str
    uri: str
    display_name: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistOwner':
        _external_urls = PlaylistExternalUrls1.from_dict(obj.get('external_urls'))
        _followers = PlaylistFollowers1.from_dict(obj.get('followers'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _display_name = obj.get('display_name') if obj and 'display_name' in obj else None
        return PlaylistOwner(_external_urls, _followers, _href, _id, _type, _uri, _display_name, obj)
    def __getitem__(self, item):
        if item == 'external_urls':
            return self.external_urls
        elif item == 'followers':
            return self.followers
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        elif item == 'display_name':
            return self.display_name
        return None

@dataclass
class PlaylistExternalUrls2:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls2':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls2(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistFollowers2:
    href: str
    total: int
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistFollowers2':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return PlaylistFollowers2(_href, _total, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'total':
            return self.total
        return None

@dataclass
class PlaylistAddedBy:
    external_urls: PlaylistExternalUrls2
    followers: PlaylistFollowers2
    href: str
    id: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistAddedBy':
        _external_urls = PlaylistExternalUrls2.from_dict(obj.get('external_urls'))
        _followers = PlaylistFollowers2.from_dict(obj.get('followers'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return PlaylistAddedBy(_external_urls, _followers, _href, _id, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'external_urls':
            return self.external_urls
        elif item == 'followers':
            return self.followers
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        return None

@dataclass
class PlaylistExternalUrls3:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls3':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls3(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistImages:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return PlaylistImages(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class PlaylistRestrictions:
    reason: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistRestrictions':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return PlaylistRestrictions(_reason, obj)
    def __getitem__(self, item):
        if item == 'reason':
            return self.reason
        return None

@dataclass
class PlaylistExternalUrls4:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls4':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls4(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistArtists:
    external_urls: PlaylistExternalUrls4
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistArtists':
        _external_urls = PlaylistExternalUrls4.from_dict(obj.get('external_urls'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return PlaylistArtists(_external_urls, _href, _id, _name, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'external_urls':
            return self.external_urls
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'name':
            return self.name
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        return None

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
    _json: dict
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
        return PlaylistAlbum(_album_type, _total_tracks, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _restrictions, _type, _uri, _artists, obj)
    def __getitem__(self, item):
        if item == 'album_type':
            return self.album_type
        elif item == 'total_tracks':
            return self.total_tracks
        elif item == 'available_markets':
            return self.available_markets
        elif item == 'external_urls':
            return self.external_urls
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'images':
            return self.images
        elif item == 'name':
            return self.name
        elif item == 'release_date':
            return self.release_date
        elif item == 'release_date_precision':
            return self.release_date_precision
        elif item == 'restrictions':
            return self.restrictions
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        elif item == 'artists':
            return self.artists
        return None

@dataclass
class PlaylistExternalUrls5:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls5':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls5(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistArtists:
    external_urls: PlaylistExternalUrls5
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistArtists':
        _external_urls = PlaylistExternalUrls5.from_dict(obj.get('external_urls'))
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return PlaylistArtists(_external_urls, _href, _id, _name, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'external_urls':
            return self.external_urls
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'name':
            return self.name
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        return None

@dataclass
class PlaylistExternalIds:
    isrc: str
    ean: str
    upc: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalIds':
        _isrc = obj.get('isrc') if obj and 'isrc' in obj else None
        _ean = obj.get('ean') if obj and 'ean' in obj else None
        _upc = obj.get('upc') if obj and 'upc' in obj else None
        return PlaylistExternalIds(_isrc, _ean, _upc, obj)
    def __getitem__(self, item):
        if item == 'isrc':
            return self.isrc
        elif item == 'ean':
            return self.ean
        elif item == 'upc':
            return self.upc
        return None

@dataclass
class PlaylistExternalUrls6:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistExternalUrls6':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return PlaylistExternalUrls6(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class PlaylistLinkedFrom:
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistLinkedFrom':
        return PlaylistLinkedFrom(obj)

@dataclass
class PlaylistRestrictions1:
    reason: str
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistRestrictions1':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return PlaylistRestrictions1(_reason, obj)
    def __getitem__(self, item):
        if item == 'reason':
            return self.reason
        return None

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
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistTrack':
        if obj == None:
            print("PlaylistTrack.obj is None")
            return None
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
        return PlaylistTrack(_album, _artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_ids, _external_urls, _href, _id, _is_playable, _linked_from, _restrictions, _name, _popularity, _preview_url, _track_number, _type, _uri, _is_local, obj)
    def __getitem__(self, item):
        if item == 'album':
            return self.album
        elif item == 'artists':
            return self.artists
        elif item == 'available_markets':
            return self.available_markets
        elif item == 'disc_number':
            return self.disc_number
        elif item == 'duration_ms':
            return self.duration_ms
        elif item == 'explicit':
            return self.explicit
        elif item == 'external_ids':
            return self.external_ids
        elif item == 'external_urls':
            return self.external_urls
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'is_playable':
            return self.is_playable
        elif item == 'linked_from':
            return self.linked_from
        elif item == 'restrictions':
            return self.restrictions
        elif item == 'name':
            return self.name
        elif item == 'popularity':
            return self.popularity
        elif item == 'preview_url':
            return self.preview_url
        elif item == 'track_number':
            return self.track_number
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        elif item == 'is_local':
            return self.is_local
        return None

@dataclass
class PlaylistItems:
    added_at: str
    added_by: PlaylistAddedBy
    is_local: bool
    track: PlaylistTrack
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistItems':
        _added_at = obj.get('added_at') if obj and 'added_at' in obj else None
        _added_by = PlaylistAddedBy.from_dict(obj.get('added_by'))
        _is_local = obj.get('is_local') if obj and 'is_local' in obj else None
        _track = PlaylistTrack.from_dict(obj.get('track'))
        return PlaylistItems(_added_at, _added_by, _is_local, _track, obj)
    def __getitem__(self, item):
        if item == 'added_at':
            return self.added_at
        elif item == 'added_by':
            return self.added_by
        elif item == 'is_local':
            return self.is_local
        elif item == 'track':
            return self.track
        return None

@dataclass
class PlaylistTracks:
    href: str
    limit: int
    next: str
    offset: int
    previous: str
    total: int
    items: List[PlaylistItems]
    _json: dict
    def from_dict(obj: Any) -> 'PlaylistTracks':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [PlaylistItems.from_dict(k) for k in obj.get('items')]
        return PlaylistTracks(_href, _limit, _next, _offset, _previous, _total, _items, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'limit':
            return self.limit
        elif item == 'next':
            return self.next
        elif item == 'offset':
            return self.offset
        elif item == 'previous':
            return self.previous
        elif item == 'total':
            return self.total
        elif item == 'items':
            return self.items
        return None

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
    _json: dict
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
        return RawSpotifyApiPlaylist(_collaborative, _description, _external_urls, _followers, _href, _id, _images, _name, _owner, _public, _snapshot_id, _tracks, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'collaborative':
            return self.collaborative
        elif item == 'description':
            return self.description
        elif item == 'external_urls':
            return self.external_urls
        elif item == 'followers':
            return self.followers
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'images':
            return self.images
        elif item == 'name':
            return self.name
        elif item == 'owner':
            return self.owner
        elif item == 'public':
            return self.public
        elif item == 'snapshot_id':
            return self.snapshot_id
        elif item == 'tracks':
            return self.tracks
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        return None
