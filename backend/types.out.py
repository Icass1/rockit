from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class TrackExternalUrls:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return TrackExternalUrls(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class TrackImages:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'TrackImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return TrackImages(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class TrackRestrictions:
    reason: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackRestrictions':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return TrackRestrictions(_reason, obj)
    def __getitem__(self, item):
        if item == 'reason':
            return self.reason
        return None

@dataclass
class TrackExternalUrls1:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackExternalUrls1':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return TrackExternalUrls1(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class TrackArtists:
    external_urls: TrackExternalUrls1
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackArtists':
        _external_urls = TrackExternalUrls1.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return TrackArtists(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class TrackAlbum:
    album_type: str
    total_tracks: int
    available_markets: List[str]
    external_urls: TrackExternalUrls
    href: str
    id: str
    images: List[TrackImages]
    name: str
    release_date: str
    release_date_precision: str
    restrictions: TrackRestrictions
    type: str
    uri: str
    artists: List[TrackArtists]
    _json: dict
    def from_dict(obj: Any) -> 'TrackAlbum':
        _album_type = obj.get('album_type') if obj and 'album_type' in obj else None
        _total_tracks = obj.get('total_tracks') if obj and 'total_tracks' in obj else None
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _external_urls = TrackExternalUrls.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [TrackImages.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _release_date = obj.get('release_date') if obj and 'release_date' in obj else None
        _release_date_precision = obj.get('release_date_precision') if obj and 'release_date_precision' in obj else None
        _restrictions = TrackRestrictions.from_dict(obj.get('restrictions')) if obj and 'restrictions' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _artists = [TrackArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        return TrackAlbum(_album_type, _total_tracks, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _restrictions, _type, _uri, _artists, obj)
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
class TrackExternalUrls2:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackExternalUrls2':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return TrackExternalUrls2(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class TrackArtists:
    external_urls: TrackExternalUrls2
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackArtists':
        _external_urls = TrackExternalUrls2.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return TrackArtists(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class TrackExternalIds:
    isrc: str
    ean: str
    upc: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackExternalIds':
        _isrc = obj.get('isrc') if obj and 'isrc' in obj else None
        _ean = obj.get('ean') if obj and 'ean' in obj else None
        _upc = obj.get('upc') if obj and 'upc' in obj else None
        return TrackExternalIds(_isrc, _ean, _upc, obj)
    def __getitem__(self, item):
        if item == 'isrc':
            return self.isrc
        elif item == 'ean':
            return self.ean
        elif item == 'upc':
            return self.upc
        return None

@dataclass
class TrackExternalUrls3:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackExternalUrls3':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return TrackExternalUrls3(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class TrackLinkedFrom:
    _json: dict
    def from_dict(obj: Any) -> 'TrackLinkedFrom':
        return TrackLinkedFrom(obj)

@dataclass
class TrackRestrictions1:
    reason: str
    _json: dict
    def from_dict(obj: Any) -> 'TrackRestrictions1':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return TrackRestrictions1(_reason, obj)
    def __getitem__(self, item):
        if item == 'reason':
            return self.reason
        return None

@dataclass
class RawSpotifyApiTrack:
    album: TrackAlbum
    artists: List[TrackArtists]
    available_markets: List[str]
    disc_number: int
    duration_ms: int
    explicit: bool
    external_ids: TrackExternalIds
    external_urls: TrackExternalUrls3
    href: str
    id: str
    is_playable: bool
    linked_from: TrackLinkedFrom
    restrictions: TrackRestrictions1
    name: str
    popularity: int
    preview_url: str
    track_number: int
    type: str
    uri: str
    is_local: bool
    _json: dict
    def from_dict(obj: Any) -> 'RawSpotifyApiTrack':
        _album = TrackAlbum.from_dict(obj.get('album')) if obj and 'album' in obj else None
        _artists = [TrackArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _available_markets = obj.get('available_markets') if obj and 'available_markets' in obj else None
        _disc_number = obj.get('disc_number') if obj and 'disc_number' in obj else None
        _duration_ms = obj.get('duration_ms') if obj and 'duration_ms' in obj else None
        _explicit = obj.get('explicit') if obj and 'explicit' in obj else None
        _external_ids = TrackExternalIds.from_dict(obj.get('external_ids')) if obj and 'external_ids' in obj else None
        _external_urls = TrackExternalUrls3.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _is_playable = obj.get('is_playable') if obj and 'is_playable' in obj else None
        _linked_from = TrackLinkedFrom.from_dict(obj.get('linked_from')) if obj and 'linked_from' in obj else None
        _restrictions = TrackRestrictions1.from_dict(obj.get('restrictions')) if obj and 'restrictions' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _preview_url = obj.get('preview_url') if obj and 'preview_url' in obj else None
        _track_number = obj.get('track_number') if obj and 'track_number' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _is_local = obj.get('is_local') if obj and 'is_local' in obj else None
        return RawSpotifyApiTrack(_album, _artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_ids, _external_urls, _href, _id, _is_playable, _linked_from, _restrictions, _name, _popularity, _preview_url, _track_number, _type, _uri, _is_local, obj)
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

