from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class SpotifySearchResultsExternalUrls:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsArtists:
    external_urls: SpotifySearchResultsExternalUrls
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsArtists':
        _external_urls = SpotifySearchResultsExternalUrls.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsArtists(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class SpotifySearchResultsExternalUrls1:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls1':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls1(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsImages:
    height: int
    width: int
    url: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsImages':
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _url = obj.get('url') if obj and 'url' in obj else None
        return SpotifySearchResultsImages(_height, _width, _url, obj)
    def __getitem__(self, item):
        if item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        elif item == 'url':
            return self.url
        return None

@dataclass
class SpotifySearchResultsAlbum:
    album_type: str
    artists: List[SpotifySearchResultsArtists]
    available_markets: List[str]
    external_urls: SpotifySearchResultsExternalUrls1
    href: str
    id: str
    images: List[SpotifySearchResultsImages]
    is_playable: bool
    name: str
    release_date: str
    release_date_precision: str
    total_tracks: int
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsAlbum':
        _album_type = obj.get('album_type') if obj and 'album_type' in obj else None
        _artists = [SpotifySearchResultsArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _external_urls = SpotifySearchResultsExternalUrls1.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [SpotifySearchResultsImages.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _is_playable = obj.get('is_playable') if obj and 'is_playable' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _release_date = obj.get('release_date') if obj and 'release_date' in obj else None
        _release_date_precision = obj.get('release_date_precision') if obj and 'release_date_precision' in obj else None
        _total_tracks = obj.get('total_tracks') if obj and 'total_tracks' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsAlbum(_album_type, _artists, _available_markets, _external_urls, _href, _id, _images, _is_playable, _name, _release_date, _release_date_precision, _total_tracks, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'album_type':
            return self.album_type
        elif item == 'artists':
            return self.artists
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
        elif item == 'is_playable':
            return self.is_playable
        elif item == 'name':
            return self.name
        elif item == 'release_date':
            return self.release_date
        elif item == 'release_date_precision':
            return self.release_date_precision
        elif item == 'total_tracks':
            return self.total_tracks
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        return None

@dataclass
class SpotifySearchResultsExternalUrls2:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls2':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls2(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsArtists1:
    external_urls: SpotifySearchResultsExternalUrls2
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsArtists1':
        _external_urls = SpotifySearchResultsExternalUrls2.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsArtists1(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class SpotifySearchResultsExternalIds:
    isrc: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalIds':
        _isrc = obj.get('isrc') if obj and 'isrc' in obj else None
        return SpotifySearchResultsExternalIds(_isrc, obj)
    def __getitem__(self, item):
        if item == 'isrc':
            return self.isrc
        return None

@dataclass
class SpotifySearchResultsExternalUrls3:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls3':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls3(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsItems:
    album: SpotifySearchResultsAlbum
    artists: List[SpotifySearchResultsArtists1]
    available_markets: List[str]
    disc_number: int
    duration_ms: int
    explicit: bool
    external_ids: SpotifySearchResultsExternalIds
    external_urls: SpotifySearchResultsExternalUrls3
    href: str
    id: str
    is_local: bool
    is_playable: bool
    name: str
    popularity: int
    preview_url: Any
    track_number: int
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsItems':
        _album = SpotifySearchResultsAlbum.from_dict(obj.get('album')) if obj and 'album' in obj else None
        _artists = [SpotifySearchResultsArtists1.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _disc_number = obj.get('disc_number') if obj and 'disc_number' in obj else None
        _duration_ms = obj.get('duration_ms') if obj and 'duration_ms' in obj else None
        _explicit = obj.get('explicit') if obj and 'explicit' in obj else None
        _external_ids = SpotifySearchResultsExternalIds.from_dict(obj.get('external_ids')) if obj and 'external_ids' in obj else None
        _external_urls = SpotifySearchResultsExternalUrls3.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _is_local = obj.get('is_local') if obj and 'is_local' in obj else None
        _is_playable = obj.get('is_playable') if obj and 'is_playable' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _preview_url = obj.get('preview_url') if obj and 'preview_url' in obj else None
        _track_number = obj.get('track_number') if obj and 'track_number' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsItems(_album, _artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_ids, _external_urls, _href, _id, _is_local, _is_playable, _name, _popularity, _preview_url, _track_number, _type, _uri, obj)
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
        elif item == 'is_local':
            return self.is_local
        elif item == 'is_playable':
            return self.is_playable
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
        return None

@dataclass
class SpotifySearchResultsTracks:
    href: str
    limit: int
    next: str
    offset: int
    previous: Any
    total: int
    items: List[SpotifySearchResultsItems]
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsTracks':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [SpotifySearchResultsItems.from_dict(k) for k in obj.get('items')] if obj and 'items' in obj else None
        return SpotifySearchResultsTracks(_href, _limit, _next, _offset, _previous, _total, _items, obj)
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
class SpotifySearchResultsExternalUrls4:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls4':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls4(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsFollowers:
    href: Any
    total: int
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsFollowers':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return SpotifySearchResultsFollowers(_href, _total, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'total':
            return self.total
        return None

@dataclass
class SpotifySearchResultsImages1:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsImages1':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return SpotifySearchResultsImages1(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class SpotifySearchResultsItems1:
    external_urls: SpotifySearchResultsExternalUrls4
    followers: SpotifySearchResultsFollowers
    genres: List[str]
    href: str
    id: str
    images: List[SpotifySearchResultsImages1]
    name: str
    popularity: int
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsItems1':
        _external_urls = SpotifySearchResultsExternalUrls4.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _followers = SpotifySearchResultsFollowers.from_dict(obj.get('followers')) if obj and 'followers' in obj else None
        _genres = obj.get('genres') if obj and 'genres' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [SpotifySearchResultsImages1.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsItems1(_external_urls, _followers, _genres, _href, _id, _images, _name, _popularity, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'external_urls':
            return self.external_urls
        elif item == 'followers':
            return self.followers
        elif item == 'genres':
            return self.genres
        elif item == 'href':
            return self.href
        elif item == 'id':
            return self.id
        elif item == 'images':
            return self.images
        elif item == 'name':
            return self.name
        elif item == 'popularity':
            return self.popularity
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        return None

@dataclass
class SpotifySearchResultsArtists2:
    href: str
    limit: int
    next: str
    offset: int
    previous: Any
    total: int
    items: List[SpotifySearchResultsItems1]
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsArtists2':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [SpotifySearchResultsItems1.from_dict(k) for k in obj.get('items')] if obj and 'items' in obj else None
        return SpotifySearchResultsArtists2(_href, _limit, _next, _offset, _previous, _total, _items, obj)
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
class SpotifySearchResultsExternalUrls5:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls5':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls5(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsImages2:
    height: int
    url: str
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsImages2':
        _height = obj.get('height') if obj and 'height' in obj else None
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return SpotifySearchResultsImages2(_height, _url, _width, obj)
    def __getitem__(self, item):
        if item == 'height':
            return self.height
        elif item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        return None

@dataclass
class SpotifySearchResultsExternalUrls6:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls6':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls6(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsArtists3:
    external_urls: SpotifySearchResultsExternalUrls6
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsArtists3':
        _external_urls = SpotifySearchResultsExternalUrls6.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsArtists3(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class SpotifySearchResultsItems2:
    album_type: str
    total_tracks: int
    available_markets: List[str]
    external_urls: SpotifySearchResultsExternalUrls5
    href: str
    id: str
    images: List[SpotifySearchResultsImages2]
    name: str
    release_date: str
    release_date_precision: str
    type: str
    uri: str
    artists: List[SpotifySearchResultsArtists3]
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsItems2':
        _album_type = obj.get('album_type') if obj and 'album_type' in obj else None
        _total_tracks = obj.get('total_tracks') if obj and 'total_tracks' in obj else None
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _external_urls = SpotifySearchResultsExternalUrls5.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [SpotifySearchResultsImages2.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _release_date = obj.get('release_date') if obj and 'release_date' in obj else None
        _release_date_precision = obj.get('release_date_precision') if obj and 'release_date_precision' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _artists = [SpotifySearchResultsArtists3.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        return SpotifySearchResultsItems2(_album_type, _total_tracks, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _type, _uri, _artists, obj)
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
        elif item == 'type':
            return self.type
        elif item == 'uri':
            return self.uri
        elif item == 'artists':
            return self.artists
        return None

@dataclass
class SpotifySearchResultsAlbums:
    href: str
    limit: int
    next: str
    offset: int
    previous: Any
    total: int
    items: List[SpotifySearchResultsItems2]
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsAlbums':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [SpotifySearchResultsItems2.from_dict(k) for k in obj.get('items')] if obj and 'items' in obj else None
        return SpotifySearchResultsAlbums(_href, _limit, _next, _offset, _previous, _total, _items, obj)
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
class SpotifySearchResultsExternalUrls7:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls7':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls7(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsImages3:
    height: Any
    url: str
    width: Any
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsImages3':
        _height = obj.get('height') if obj and 'height' in obj else None
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return SpotifySearchResultsImages3(_height, _url, _width, obj)
    def __getitem__(self, item):
        if item == 'height':
            return self.height
        elif item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        return None

@dataclass
class SpotifySearchResultsExternalUrls8:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsExternalUrls8':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifySearchResultsExternalUrls8(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifySearchResultsOwner:
    display_name: str
    external_urls: SpotifySearchResultsExternalUrls8
    href: str
    id: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsOwner':
        _display_name = obj.get('display_name') if obj and 'display_name' in obj else None
        _external_urls = SpotifySearchResultsExternalUrls8.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsOwner(_display_name, _external_urls, _href, _id, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'display_name':
            return self.display_name
        elif item == 'external_urls':
            return self.external_urls
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
class SpotifySearchResultsTracks1:
    href: str
    total: int
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsTracks1':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return SpotifySearchResultsTracks1(_href, _total, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'total':
            return self.total
        return None

@dataclass
class SpotifySearchResultsItems3:
    collaborative: bool
    description: str
    external_urls: SpotifySearchResultsExternalUrls7
    href: str
    id: str
    images: List[SpotifySearchResultsImages3]
    name: str
    owner: SpotifySearchResultsOwner
    primary_color: Any
    public: bool
    snapshot_id: str
    tracks: SpotifySearchResultsTracks1
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsItems3':
        _collaborative = obj.get('collaborative') if obj and 'collaborative' in obj else None
        _description = obj.get('description') if obj and 'description' in obj else None
        _external_urls = SpotifySearchResultsExternalUrls7.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [SpotifySearchResultsImages3.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _owner = SpotifySearchResultsOwner.from_dict(obj.get('owner')) if obj and 'owner' in obj else None
        _primary_color = obj.get('primary_color') if obj and 'primary_color' in obj else None
        _public = obj.get('public') if obj and 'public' in obj else None
        _snapshot_id = obj.get('snapshot_id') if obj and 'snapshot_id' in obj else None
        _tracks = SpotifySearchResultsTracks1.from_dict(obj.get('tracks')) if obj and 'tracks' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return SpotifySearchResultsItems3(_collaborative, _description, _external_urls, _href, _id, _images, _name, _owner, _primary_color, _public, _snapshot_id, _tracks, _type, _uri, obj)
    def __getitem__(self, item):
        if item == 'collaborative':
            return self.collaborative
        elif item == 'description':
            return self.description
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
        elif item == 'owner':
            return self.owner
        elif item == 'primary_color':
            return self.primary_color
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

@dataclass
class SpotifySearchResultsPlaylists:
    href: str
    limit: int
    next: str
    offset: int
    previous: Any
    total: int
    items: List[SpotifySearchResultsItems3]
    _json: dict
    def from_dict(obj: Any) -> 'SpotifySearchResultsPlaylists':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [SpotifySearchResultsItems3.from_dict(k) for k in obj.get('items')] if obj and 'items' in obj else None
        return SpotifySearchResultsPlaylists(_href, _limit, _next, _offset, _previous, _total, _items, obj)
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
class RawSpotifyApiSearchResults:
    tracks: SpotifySearchResultsTracks
    artists: SpotifySearchResultsArtists2
    albums: SpotifySearchResultsAlbums
    playlists: SpotifySearchResultsPlaylists
    _json: dict
    def from_dict(obj: Any) -> 'RawSpotifyApiSearchResults':
        _tracks = SpotifySearchResultsTracks.from_dict(obj.get('tracks')) if obj and 'tracks' in obj else None
        _artists = SpotifySearchResultsArtists2.from_dict(obj.get('artists')) if obj and 'artists' in obj else None
        _albums = SpotifySearchResultsAlbums.from_dict(obj.get('albums')) if obj and 'albums' in obj else None
        _playlists = SpotifySearchResultsPlaylists.from_dict(obj.get('playlists')) if obj and 'playlists' in obj else None
        return RawSpotifyApiSearchResults(_tracks, _artists, _albums, _playlists, obj)
    def __getitem__(self, item):
        if item == 'tracks':
            return self.tracks
        elif item == 'artists':
            return self.artists
        elif item == 'albums':
            return self.albums
        elif item == 'playlists':
            return self.playlists
        return None

