from typing import List
from typing import Any
from dataclasses import dataclass

@dataclass
class SongExternalUrls:
    spotify: str

    @staticmethod
    def from_dict(obj: Any) -> 'SongExternalUrls':
        _spotify = str(obj.get("spotify"))
        return SongExternalUrls(_spotify)

@dataclass
class SongExternalIds:
    isrc: str

    @staticmethod
    def from_dict(obj: Any) -> 'SongExternalIds':
        _isrc = str(obj.get("isrc"))
        return SongExternalIds(_isrc)
@dataclass
class SongArtist:
    external_urls: SongExternalUrls
    href: str
    id: str
    name: str
    type: str
    uri: str
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'SongArtist':
        _external_urls = SongExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _name = str(obj.get("name"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        return SongArtist(_external_urls, _href, _id, _name, _type, _uri, obj)


@dataclass
class SongImage:
    height: int
    url: str
    width: int
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'SongImage':
        _height = int(obj.get("height"))
        _url = str(obj.get("url"))
        _width = int(obj.get("width"))
        return SongImage(_height, _url, _width, obj)

@dataclass
class SongAlbum:
    album_type: str
    artists: List[SongArtist]
    available_markets: List[str]
    external_urls: SongExternalUrls
    href: str
    id: str
    images: List[SongImage]
    name: str
    release_date: str
    release_date_precision: str
    total_tracks: int
    type: str
    uri: str

    @staticmethod
    def from_dict(obj: Any) -> 'SongAlbum':
        _album_type = str(obj.get("album_type"))
        _artists = [SongArtist.from_dict(y) for y in obj.get("artists")]
        _available_markets = list
        _external_urls = SongExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _images = [SongImage.from_dict(y) for y in obj.get("images")]
        _name = str(obj.get("name"))
        _release_date = str(obj.get("release_date"))
        _release_date_precision = str(obj.get("release_date_precision"))
        _total_tracks = int(obj.get("total_tracks"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        return SongAlbum(_album_type, _artists, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _total_tracks, _type, _uri)


@dataclass
class RawSpotifyApiSong:
    album: SongAlbum
    artists: List[SongArtist]
    available_markets: List[str]
    disc_number: int
    duration_ms: int
    explicit: bool
    external_ids: SongExternalIds
    external_urls: SongExternalUrls
    href: str
    id: str
    is_local: bool
    name: str
    popularity: int
    track_number: int
    type: str
    uri: str
    json: dict


    @staticmethod
    def from_dict(obj: Any) -> 'RawSpotifyApiSong':
        _album = SongAlbum.from_dict(obj.get("album"))
        _artists = [SongArtist.from_dict(y) for y in obj.get("artists")]
        _available_markets = [y for y in obj.get("available_markets")]
        _disc_number = int(obj.get("disc_number"))
        _duration_ms = int(obj.get("duration_ms"))
        _explicit = False
        _external_ids = SongExternalIds.from_dict(obj.get("external_ids"))
        _external_urls = SongExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _is_local = False
        _name = str(obj.get("name"))
        _popularity = int(obj.get("popularity"))
        _track_number = int(obj.get("track_number"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        return RawSpotifyApiSong(_album, _artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_ids, _external_urls, _href, _id, _is_local, _name, _popularity, _track_number, _type, _uri, obj)






@dataclass
class AlbumCopyright:
    text: str
    type: str
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumCopyright':
        _text = str(obj.get("text"))
        _type = str(obj.get("type"))
        return AlbumCopyright(_text, _type, obj)

@dataclass
class AlbumExternalIds:
    isrc: str
    ean: str
    upc: str

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumExternalIds':
        _isrc = str(obj.get("isrc"))
        _ean = str(obj.get("ean"))
        _upc = str(obj.get("upc"))
        return AlbumExternalIds(_isrc, _ean, _upc)

@dataclass
class AlbumExternalUrls:
    spotify: str

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumExternalUrls':
        _spotify = str(obj.get("spotify"))
        return AlbumExternalUrls(_spotify)

@dataclass
class AlbumArtist:
    external_urls: AlbumExternalUrls
    href: str
    id: str
    name: str
    type: str
    uri: str
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumArtist':
        _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _name = str(obj.get("name"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        return AlbumArtist(_external_urls, _href, _id, _name, _type, _uri, obj)

@dataclass
class AlbumImage:
    url: str
    height: int
    width: int
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumImage':
        _url = str(obj.get("url"))
        _height = int(obj.get("height"))
        _width = int(obj.get("width"))
        return AlbumImage(_url, _height, _width, obj)

    def __getitem__(self, item):
        if item == "url":
            return self.url
        elif item == "width":
            return self.width
        elif item == "height":
            return self.height

@dataclass
class AlbumLinkedFrom:
    external_urls: AlbumExternalUrls
    href: str
    id: str
    type: str
    uri: str

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumLinkedFrom':
        if not obj: return None
        _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        return AlbumLinkedFrom(_external_urls, _href, _id, _type, _uri)
    
@dataclass
class AlbumRestrictions:
    reason: str

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumRestrictions':
        if not obj: return None
        _reason = str(obj.get("reason"))
        return AlbumRestrictions(_reason)


@dataclass
class AlbumItem:
    artists: List[AlbumArtist]
    available_markets: List[str]
    disc_number: int
    duration_ms: int
    explicit: bool
    external_urls: AlbumExternalUrls
    href: str
    id: str
    is_playable: bool
    linked_from: AlbumLinkedFrom
    restrictions: AlbumRestrictions
    name: str
    preview_url: str
    track_number: int
    type: str
    uri: str
    is_local: bool
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumItem':
        _artists = [AlbumArtist.from_dict(y) for y in obj.get("artists")]
        _available_markets = [y for y in obj.get("available_markets")]
        _disc_number = int(obj.get("disc_number"))
        _duration_ms = int(obj.get("duration_ms"))
        _explicit = bool(obj.get("explicit"))
        _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _is_playable = bool(obj.get("is_playable"))
        _linked_from = AlbumLinkedFrom.from_dict(obj.get("linked_from"))
        _restrictions = AlbumRestrictions.from_dict(obj.get("restrictions"))
        _name = str(obj.get("name"))
        _preview_url = str(obj.get("preview_url"))
        _track_number = int(obj.get("track_number"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        _is_local = bool(obj.get("is_local"))
        return AlbumItem(_artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_urls, _href, _id, _is_playable, _linked_from, _restrictions, _name, _preview_url, _track_number, _type, _uri, _is_local, obj)




@dataclass
class AlbumTracks:
    href: str
    limit: int
    next: str
    offset: int
    previous: str
    total: int
    items: List[AlbumItem]
    json: dict

    def __dict__(self):
        return self.json

    @staticmethod
    def from_dict(obj: Any) -> 'AlbumTracks':
        _href = str(obj.get("href"))
        _limit = int(obj.get("limit"))
        _next = str(obj.get("next"))
        _offset = int(obj.get("offset"))
        _previous = str(obj.get("previous"))
        _total = int(obj.get("total"))
        _items = [AlbumItem.from_dict(y) for y in obj.get("items")]
        return AlbumTracks(_href, _limit, _next, _offset, _previous, _total, _items, obj)



@dataclass
class RawSpotifyApiAlbum:
    album_type: str
    total_tracks: int
    available_markets: List[str]
    external_urls: AlbumExternalUrls
    href: str
    id: str
    images: List[AlbumImage]
    name: str
    release_date: str
    release_date_precision: str
    restrictions: AlbumRestrictions
    type: str
    uri: str
    artists: List[AlbumArtist]
    tracks: AlbumTracks
    copyrights: List[AlbumCopyright]
    external_ids: AlbumExternalIds
    genres: List[str]
    label: str
    popularity: int
    json: dict

    @staticmethod
    def from_dict(obj: Any) -> 'RawSpotifyApiAlbum':
        _album_type = str(obj.get("album_type"))
        _total_tracks = int(obj.get("total_tracks"))
        _available_markets = [y for y in obj.get("available_markets")]
        _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
        _href = str(obj.get("href"))
        _id = str(obj.get("id"))
        _images = [AlbumImage.from_dict(y) for y in obj.get("images")]
        _name = str(obj.get("name"))
        _release_date = str(obj.get("release_date"))
        _release_date_precision = str(obj.get("release_date_precision"))
        _restrictions = AlbumRestrictions.from_dict(obj.get("restrictions"))
        _type = str(obj.get("type"))
        _uri = str(obj.get("uri"))
        _artists = [AlbumArtist.from_dict(y) for y in obj.get("artists")]
        _tracks = AlbumTracks.from_dict(obj.get("tracks"))
        _copyrights = [AlbumCopyright.from_dict(y) for y in obj.get("copyrights")]
        _external_ids = AlbumExternalIds.from_dict(obj.get("external_ids"))
        _genres = [y for y in obj.get("genres")]
        _label = str(obj.get("label"))
        _popularity = int(obj.get("popularity"))
        return RawSpotifyApiAlbum(_album_type, _total_tracks, _available_markets, _external_urls, _href, _id, _images, _name, _release_date, _release_date_precision, _restrictions, _type, _uri, _artists, _tracks, _copyrights, _external_ids, _genres, _label, _popularity, obj)







# @dataclass
# class AlbumCopyright:
#     text: str
#     type: str

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumCopyright':
#         _text = str(obj.get("text"))
#         _type = str(obj.get("type"))
#         return AlbumCopyright(_text, _type)

# @dataclass
# class AlbumExternalIds:
#     isrc: str
#     ean: str
#     upc: str

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumExternalIds':
#         _isrc = str(obj.get("isrc"))
#         _ean = str(obj.get("ean"))
#         _upc = str(obj.get("upc"))
#         return AlbumExternalIds(_isrc, _ean, _upc)

# @dataclass
# class AlbumExternalUrls:
#     spotify: str

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumExternalUrls':
#         _spotify = str(obj.get("spotify"))
#         return AlbumExternalUrls(_spotify)

# @dataclass
# class AlbumArtist:
#     external_urls: AlbumExternalUrls
#     href: str
#     id: str
#     name: str
#     type: str
#     uri: str

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumArtist':
#         _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
#         _href = str(obj.get("href"))
#         _id = str(obj.get("id"))
#         _name = str(obj.get("name"))
#         _type = str(obj.get("type"))
#         _uri = str(obj.get("uri"))
#         return AlbumArtist(_external_urls, _href, _id, _name, _type, _uri)


# @dataclass
# class AlbumImage:
#     height: int
#     url: str
#     width: int

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumImage':
#         _height = int(obj.get("height"))
#         _url = str(obj.get("url"))
#         _width = int(obj.get("width"))
#         return AlbumImage(_height, _url, _width)

#     def __getitem__(self, item):
#         if item == "url":
#             return self.url
#         elif item == "width":
#             return self.width
#         elif item == "height":
#             return self.height
# @dataclass
# class AlbumItem:
#     artists: List[AlbumArtist]
#     available_markets: List[str]
#     disc_number: int
#     duration_ms: int
#     explicit: bool
#     external_urls: AlbumExternalUrls
#     href: str
#     id: str
#     is_local: bool
#     name: str
#     preview_url: str
#     track_number: int
#     type: str
#     uri: str

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumItem':
#         _artists = [AlbumArtist.from_dict(y) for y in obj.get("artists")]
#         _available_markets = [y for y in obj.get("available_markets")]
#         _disc_number = int(obj.get("disc_number"))
#         _duration_ms = int(obj.get("duration_ms"))
#         _explicit = obj["explicit"]
#         _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
#         _href = str(obj.get("href"))
#         _id = str(obj.get("id"))
#         _is_local = obj["is_local"]
#         _name = str(obj.get("name"))
#         _preview_url = str(obj.get("preview_url"))
#         _track_number = int(obj.get("track_number"))
#         _type = str(obj.get("type"))
#         _uri = str(obj.get("uri"))
#         return AlbumItem(_artists, _available_markets, _disc_number, _duration_ms, _explicit, _external_urls, _href, _id, _is_local, _name, _preview_url, _track_number, _type, _uri)

# @dataclass
# class AlbumTracks:
#     href: str
#     items: List[AlbumItem]

#     @staticmethod
#     def from_dict(obj: Any) -> 'AlbumTracks':
#         _href = str(obj.get("href"))
#         _items = [AlbumItem.from_dict(y) for y in obj.get("items")]
#         return AlbumTracks(_href, _items)

# @dataclass
# class RawSpotifyApiAlbum:
#     album_type: str
#     artists: List[AlbumArtist]
#     available_markets: List[str]
#     copyrights: List[AlbumCopyright]
#     external_ids: AlbumExternalIds
#     external_urls: AlbumExternalUrls
#     genres: List[object]
#     href: str
#     id: str
#     images: List[AlbumImage]
#     label: str
#     name: str
#     popularity: int
#     release_date: str
#     release_date_precision: str
#     total_tracks: int
#     tracks: AlbumTracks

#     @staticmethod
#     def from_dict(obj: Any) -> 'RawSpotifyApiAlbum':
#         _album_type = str(obj.get("album_type"))
#         _artists = [AlbumArtist.from_dict(y) for y in obj.get("artists")]
#         _available_markets = [y for y in obj.get("available_markets")]
#         _copyrights = [AlbumCopyright.from_dict(y) for y in obj.get("copyrights")]
#         _external_ids = AlbumExternalIds.from_dict(obj.get("external_ids"))
#         _external_urls = AlbumExternalUrls.from_dict(obj.get("external_urls"))
#         _genres = [y for y in obj.get("genres")]
#         _href = str(obj.get("href"))
#         _id = str(obj.get("id"))
#         _images = [AlbumImage.from_dict(y) for y in obj.get("images")]
#         _label = str(obj.get("label"))
#         _name = str(obj.get("name"))
#         _popularity = int(obj.get("popularity"))
#         _release_date = str(obj.get("release_date"))
#         _release_date_precision = str(obj.get("release_date_precision"))
#         _total_tracks = int(obj.get("total_tracks"))
#         _tracks = AlbumTracks.from_dict(obj.get("tracks"))
#         return RawSpotifyApiAlbum(_album_type, _artists, _available_markets, _copyrights, _external_ids, _external_urls, _genres, _href, _id, _images, _label, _name, _popularity, _release_date, _release_date_precision, _total_tracks, _tracks)
