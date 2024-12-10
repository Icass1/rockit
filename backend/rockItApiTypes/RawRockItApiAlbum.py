from typing import List, Any
from dataclasses import dataclass

@dataclass
class RockItAlbumImages:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return RockItAlbumImages(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class RockItAlbumArtists:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumArtists':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return RockItAlbumArtists(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class RockItAlbumCopyrights:
    text: str
    type: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumCopyrights':
        _text = obj.get('text') if obj and 'text' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        return RockItAlbumCopyrights(_text, _type, obj)
    def __getitem__(self, item):
        if item == 'text':
            return self.text
        elif item == 'type':
            return self.type
        return None

@dataclass
class RockItAlbumExternalUrls:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return RockItAlbumExternalUrls(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class RockItAlbumAlbumArtist:
    external_urls: RockItAlbumExternalUrls
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumAlbumArtist':
        _external_urls = RockItAlbumExternalUrls.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return RockItAlbumAlbumArtist(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class RockItAlbumExternalUrls1:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumExternalUrls1':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return RockItAlbumExternalUrls1(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class RockItAlbumArtists1:
    external_urls: RockItAlbumExternalUrls1
    href: str
    id: str
    name: str
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumArtists1':
        _external_urls = RockItAlbumExternalUrls1.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return RockItAlbumArtists1(_external_urls, _href, _id, _name, _type, _uri, obj)
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
class RockItAlbumImages1:
    height: int
    url: str
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumImages1':
        _height = obj.get('height') if obj and 'height' in obj else None
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return RockItAlbumImages1(_height, _url, _width, obj)
    def __getitem__(self, item):
        if item == 'height':
            return self.height
        elif item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        return None

@dataclass
class RockItAlbumSongs:
    albumArtist: List[RockItAlbumAlbumArtist]
    albumId: str
    albumName: str
    albumType: str
    name: str
    artists: List[RockItAlbumArtists1]
    date: str
    discNumber: int
    duration: float
    trackNumber: int
    id: str
    images: List[RockItAlbumImages1]
    copyright: str
    genres: List[Any]
    lyrics: str
    path: str
    popularity: int
    publisher: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItAlbumSongs':
        _albumArtist = [RockItAlbumAlbumArtist.from_dict(k) for k in obj.get('albumArtist')] if obj and 'albumArtist' in obj else None
        _albumId = obj.get('albumId') if obj and 'albumId' in obj else None
        _albumName = obj.get('albumName') if obj and 'albumName' in obj else None
        _albumType = obj.get('albumType') if obj and 'albumType' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _artists = [RockItAlbumArtists1.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _date = obj.get('date') if obj and 'date' in obj else None
        _discNumber = obj.get('discNumber') if obj and 'discNumber' in obj else None
        _duration = obj.get('duration') if obj and 'duration' in obj else None
        _trackNumber = obj.get('trackNumber') if obj and 'trackNumber' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [RockItAlbumImages1.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _copyright = obj.get('copyright') if obj and 'copyright' in obj else None
        _genres = obj.get('genres') if obj and 'genres' in obj else None
        _lyrics = obj.get('lyrics') if obj and 'lyrics' in obj else None
        _path = obj.get('path') if obj and 'path' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _publisher = obj.get('publisher') if obj and 'publisher' in obj else None
        return RockItAlbumSongs(_albumArtist, _albumId, _albumName, _albumType, _name, _artists, _date, _discNumber, _duration, _trackNumber, _id, _images, _copyright, _genres, _lyrics, _path, _popularity, _publisher, obj)
    def __getitem__(self, item):
        if item == 'albumArtist':
            return self.albumArtist
        elif item == 'albumId':
            return self.albumId
        elif item == 'albumName':
            return self.albumName
        elif item == 'albumType':
            return self.albumType
        elif item == 'name':
            return self.name
        elif item == 'artists':
            return self.artists
        elif item == 'date':
            return self.date
        elif item == 'discNumber':
            return self.discNumber
        elif item == 'duration':
            return self.duration
        elif item == 'trackNumber':
            return self.trackNumber
        elif item == 'id':
            return self.id
        elif item == 'images':
            return self.images
        elif item == 'copyright':
            return self.copyright
        elif item == 'genres':
            return self.genres
        elif item == 'lyrics':
            return self.lyrics
        elif item == 'path':
            return self.path
        elif item == 'popularity':
            return self.popularity
        elif item == 'publisher':
            return self.publisher
        return None

@dataclass
class RawRockItApiAlbum:
    id: str
    type: str
    images: List[RockItAlbumImages]
    image: str
    name: str
    releaseDate: str
    artists: List[RockItAlbumArtists]
    copyrights: List[RockItAlbumCopyrights]
    popularity: int
    genres: List[Any]
    songs: List[RockItAlbumSongs]
    discCount: int
    dateAdded: int
    _json: dict
    def from_dict(obj: Any) -> 'RawRockItApiAlbum':
        _id = obj.get('id') if obj and 'id' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _images = [RockItAlbumImages.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _image = obj.get('image') if obj and 'image' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _releaseDate = obj.get('releaseDate') if obj and 'releaseDate' in obj else None
        _artists = [RockItAlbumArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _copyrights = [RockItAlbumCopyrights.from_dict(k) for k in obj.get('copyrights')] if obj and 'copyrights' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _genres = obj.get('genres') if obj and 'genres' in obj else None
        _songs = [RockItAlbumSongs.from_dict(k) for k in obj.get('songs')] if obj and 'songs' in obj else None
        _discCount = obj.get('discCount') if obj and 'discCount' in obj else None
        _dateAdded = obj.get('dateAdded') if obj and 'dateAdded' in obj else None
        return RawRockItApiAlbum(_id, _type, _images, _image, _name, _releaseDate, _artists, _copyrights, _popularity, _genres, _songs, _discCount, _dateAdded, obj)
    def __getitem__(self, item):
        if item == 'id':
            return self.id
        elif item == 'type':
            return self.type
        elif item == 'images':
            return self.images
        elif item == 'image':
            return self.image
        elif item == 'name':
            return self.name
        elif item == 'releaseDate':
            return self.releaseDate
        elif item == 'artists':
            return self.artists
        elif item == 'copyrights':
            return self.copyrights
        elif item == 'popularity':
            return self.popularity
        elif item == 'genres':
            return self.genres
        elif item == 'songs':
            return self.songs
        elif item == 'discCount':
            return self.discCount
        elif item == 'dateAdded':
            return self.dateAdded
        return None

