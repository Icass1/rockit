from typing import List, Any, Optional
from dataclasses import dataclass


@dataclass
class AlbumExternalUrls:
    spotify: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return AlbumExternalUrls(_spotify, obj)

    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None


@dataclass
class AlbumImages:
    url: Optional[str]
    height: Optional[int]
    width: Optional[int]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return AlbumImages(_url, _height, _width, obj)

    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None


@dataclass
class AlbumRestrictions:
    reason: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumRestrictions':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return AlbumRestrictions(_reason, obj)

    def __getitem__(self, item):
        if item == 'reason':
            return self.reason
        return None


@dataclass
class AlbumExternalUrls1:
    spotify: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumExternalUrls1':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return AlbumExternalUrls1(_spotify, obj)

    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None


@dataclass
class AlbumArtists:
    external_urls: Optional[AlbumExternalUrls1]
    href: Optional[str]
    id: Optional[str]
    name: Optional[str]
    type: Optional[str]
    uri: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumArtists':
        _external_urls = AlbumExternalUrls1.from_dict(
            obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return AlbumArtists(_external_urls, _href, _id, _name, _type, _uri, obj)

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
class AlbumExternalUrls2:
    spotify: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumExternalUrls2':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return AlbumExternalUrls2(_spotify, obj)

    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None


@dataclass
class AlbumArtists1:
    external_urls: Optional[AlbumExternalUrls2]
    href: Optional[str]
    id: Optional[str]
    name: Optional[str]
    type: Optional[str]
    uri: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumArtists1':
        _external_urls = AlbumExternalUrls2.from_dict(
            obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return AlbumArtists1(_external_urls, _href, _id, _name, _type, _uri, obj)

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
class AlbumExternalUrls3:
    spotify: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumExternalUrls3':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return AlbumExternalUrls3(_spotify, obj)

    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None


@dataclass
class AlbumExternalUrls4:
    spotify: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumExternalUrls4':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return AlbumExternalUrls4(_spotify, obj)

    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None


@dataclass
class AlbumLinkedFrom:
    external_urls: Optional[AlbumExternalUrls4]
    href: Optional[str]
    id: Optional[str]
    type: Optional[str]
    uri: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumLinkedFrom':
        _external_urls = AlbumExternalUrls4.from_dict(
            obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return AlbumLinkedFrom(_external_urls, _href, _id, _type, _uri, obj)

    def __getitem__(self, item):
        if item == 'external_urls':
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
class AlbumRestrictions1:
    reason: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumRestrictions1':
        _reason = obj.get('reason') if obj and 'reason' in obj else None
        return AlbumRestrictions1(_reason, obj)

    def __getitem__(self, item):
        if item == 'reason':
            return self.reason
        return None


@dataclass
class AlbumItems:
    artists: Optional[List[AlbumArtists1]]
    available_markets: Optional[List[str]]
    disc_number: Optional[int]
    duration_ms: Optional[int]
    explicit: Optional[bool]
    external_urls: Optional[AlbumExternalUrls3]
    href: Optional[str]
    id: Optional[str]
    is_playable: Optional[bool]
    linked_from: Optional[AlbumLinkedFrom]
    restrictions: Optional[AlbumRestrictions1]
    name: Optional[str]
    preview_url: Optional[str]
    track_number: Optional[int]
    type: Optional[str]
    uri: Optional[str]
    is_local: Optional[bool]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumItems':
        _artists = [AlbumArtists1.from_dict(k) for k in obj.get(
            'artists')] if obj and 'artists' in obj else None
        _available_markets = obj.get(
            'available_markets') if obj and 'available_markets' in obj else None
        _disc_number = obj.get(
            'disc_number') if obj and 'disc_number' in obj else None
        _duration_ms = obj.get(
            'duration_ms') if obj and 'duration_ms' in obj else None
        _explicit = obj.get('explicit') if obj and 'explicit' in obj else None
        _external_urls = AlbumExternalUrls3.from_dict(
            obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _is_playable = obj.get(
            'is_playable') if obj and 'is_playable' in obj else None
        _linked_from = AlbumLinkedFrom.from_dict(
            obj.get('linked_from')) if obj and 'linked_from' in obj else None
        _restrictions = AlbumRestrictions1.from_dict(
            obj.get('restrictions')) if obj and 'restrictions' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _preview_url = obj.get(
            'preview_url') if obj and 'preview_url' in obj else None
        _track_number = obj.get(
            'track_number') if obj and 'track_number' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _is_local = obj.get('is_local') if obj and 'is_local' in obj else None
        return AlbumItems(_artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_urls, _href, _id, _is_playable, _linked_from, _restrictions, _name, _preview_url, _track_number, _type, _uri, _is_local, obj)

    def __getitem__(self, item):
        if item == 'artists':
            return self.artists
        elif item == 'available_markets':
            return self.available_markets
        elif item == 'disc_number':
            return self.disc_number
        elif item == 'duration_ms':
            return self.duration_ms
        elif item == 'explicit':
            return self.explicit
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
class AlbumTracks:
    href: Optional[str]
    limit: Optional[int]
    next: Optional[str]
    offset: Optional[int]
    previous: Optional[str]
    total: Optional[int]
    items: Optional[List[AlbumItems]]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumTracks':
        _href = obj.get('href') if obj and 'href' in obj else None
        _limit = obj.get('limit') if obj and 'limit' in obj else None
        _next = obj.get('next') if obj and 'next' in obj else None
        _offset = obj.get('offset') if obj and 'offset' in obj else None
        _previous = obj.get('previous') if obj and 'previous' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        _items = [AlbumItems.from_dict(k) for k in obj.get(
            'items')] if obj and 'items' in obj else None
        return AlbumTracks(_href, _limit, _next, _offset, _previous, _total, _items, obj)

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
class AlbumCopyrights:
    text: Optional[str]
    type: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumCopyrights':
        _text = obj.get('text') if obj and 'text' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        return AlbumCopyrights(_text, _type, obj)

    def __getitem__(self, item):
        if item == 'text':
            return self.text
        elif item == 'type':
            return self.type
        return None


@dataclass
class AlbumExternalIds:
    isrc: Optional[str]
    ean: Optional[str]
    upc: Optional[str]
    _json: dict

    def from_dict(obj: Any) -> 'AlbumExternalIds':
        _isrc = obj.get('isrc') if obj and 'isrc' in obj else None
        _ean = obj.get('ean') if obj and 'ean' in obj else None
        _upc = obj.get('upc') if obj and 'upc' in obj else None
        return AlbumExternalIds(_isrc, _ean, _upc, obj)

    def __getitem__(self, item):
        if item == 'isrc':
            return self.isrc
        elif item == 'ean':
            return self.ean
        elif item == 'upc':
            return self.upc
        return None


@dataclass
class RawSpotifyApiAlbum:
    album_type: Optional[str]
    total_tracks: Optional[int]
    available_markets: Optional[List[str]]
    external_urls: Optional[AlbumExternalUrls]
    href: Optional[str]
    id: Optional[str]
    images: Optional[List[AlbumImages]]
    name: Optional[str]
    release_date: Optional[str]
    release_date_precision: Optional[str]
    restrictions: Optional[AlbumRestrictions]
    type: Optional[str]
    uri: Optional[str]
    artists: Optional[List[AlbumArtists]]
    tracks: Optional[AlbumTracks]
    copyrights: Optional[List[AlbumCopyrights]]
    external_ids: Optional[AlbumExternalIds]
    genres: Optional[List[Any]]
    label: Optional[str]
    popularity: Optional[int]
    _json: dict

    def from_dict(obj: Any) -> 'RawSpotifyApiAlbum':
        _album_type = obj.get(
            'album_type') if obj and 'album_type' in obj else None
        _total_tracks = obj.get(
            'total_tracks') if obj and 'total_tracks' in obj else None
        _available_markets = obj.get(
            'available_markets') if obj and 'available_markets' in obj else None
        _external_urls = AlbumExternalUrls.from_dict(
            obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [AlbumImages.from_dict(k) for k in obj.get(
            'images')] if obj and 'images' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _release_date = obj.get(
            'release_date') if obj and 'release_date' in obj else None
        _release_date_precision = obj.get(
            'release_date_precision') if obj and 'release_date_precision' in obj else None
        _restrictions = AlbumRestrictions.from_dict(
            obj.get('restrictions')) if obj and 'restrictions' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        _artists = [AlbumArtists.from_dict(k) for k in obj.get(
            'artists')] if obj and 'artists' in obj else None
        _tracks = AlbumTracks.from_dict(
            obj.get('tracks')) if obj and 'tracks' in obj else None
        _copyrights = [AlbumCopyrights.from_dict(k) for k in obj.get(
            'copyrights')] if obj and 'copyrights' in obj else None
        _external_ids = AlbumExternalIds.from_dict(
            obj.get('external_ids')) if obj and 'external_ids' in obj else None
        _genres = obj.get('genres') if obj and 'genres' in obj else None
        _label = obj.get('label') if obj and 'label' in obj else None
        _popularity = obj.get(
            'popularity') if obj and 'popularity' in obj else None
        return RawSpotifyApiAlbum(_album_type, _total_tracks, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _restrictions, _type, _uri, _artists, _tracks, _copyrights, _external_ids, _genres, _label, _popularity, obj)

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
        elif item == 'tracks':
            return self.tracks
        elif item == 'copyrights':
            return self.copyrights
        elif item == 'external_ids':
            return self.external_ids
        elif item == 'genres':
            return self.genres
        elif item == 'label':
            return self.label
        elif item == 'popularity':
            return self.popularity
        return None
