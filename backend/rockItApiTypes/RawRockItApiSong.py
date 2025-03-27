from typing import List, Any
from dataclasses import dataclass

@dataclass
class RockItSongArtists:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItSongArtists':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return RockItSongArtists(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class RockItSongAlbumArtist:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItSongAlbumArtist':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return RockItSongAlbumArtist(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class RockItSongImages:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'RockItSongImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return RockItSongImages(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class RockItSongDynamicLyrics:
    seconds: float
    lyrics: str
    _json: dict
    def from_dict(obj: Any) -> 'RockItSongDynamicLyrics':
        _seconds = obj.get('seconds') if obj and 'seconds' in obj else None
        _lyrics = obj.get('lyrics') if obj and 'lyrics' in obj else None
        return RockItSongDynamicLyrics(_seconds, _lyrics, obj)
    def __getitem__(self, item):
        if item == 'seconds':
            return self.seconds
        elif item == 'lyrics':
            return self.lyrics
        return None

@dataclass
class RawRockItApiSong:
    id: str
    name: str
    artists: List[RockItSongArtists]
    genres: List[str]
    discNumber: int
    albumName: str
    albumArtist: List[RockItSongAlbumArtist]
    albumType: str
    albumId: str
    duration: float
    date: str
    trackNumber: int
    publisher: str
    path: str
    images: List[RockItSongImages]
    image: str
    copyright: str
    downloadUrl: str
    lyrics: str
    dynamicLyrics: List[RockItSongDynamicLyrics]
    popularity: int
    dateAdded: str
    inDatabase: bool
    _json: dict
    def from_dict(obj: Any) -> 'RawRockItApiSong':
        _id = obj.get('id') if obj and 'id' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _artists = [RockItSongArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _genres = obj.get('genres') if obj and 'genres' in obj else None
        _discNumber = obj.get('discNumber') if obj and 'discNumber' in obj else None
        _albumName = obj.get('albumName') if obj and 'albumName' in obj else None
        _albumArtist = [RockItSongAlbumArtist.from_dict(k) for k in obj.get('albumArtist')] if obj and 'albumArtist' in obj else None
        _albumType = obj.get('albumType') if obj and 'albumType' in obj else None
        _albumId = obj.get('albumId') if obj and 'albumId' in obj else None
        _duration = obj.get('duration') if obj and 'duration' in obj else None
        _date = obj.get('date') if obj and 'date' in obj else None
        _trackNumber = obj.get('trackNumber') if obj and 'trackNumber' in obj else None
        _publisher = obj.get('publisher') if obj and 'publisher' in obj else None
        _path = obj.get('path') if obj and 'path' in obj else None
        _images = [RockItSongImages.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _image = obj.get('image') if obj and 'image' in obj else None
        _copyright = obj.get('copyright') if obj and 'copyright' in obj else None
        _downloadUrl = obj.get('downloadUrl') if obj and 'downloadUrl' in obj else None
        _lyrics = obj.get('lyrics') if obj and 'lyrics' in obj else None
        _dynamicLyrics = [RockItSongDynamicLyrics.from_dict(k) for k in obj.get('dynamicLyrics')] if obj and 'dynamicLyrics' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _dateAdded = obj.get('dateAdded') if obj and 'dateAdded' in obj else None
        _inDatabase = obj.get('inDatabase') if obj and 'inDatabase' in obj else None
        return RawRockItApiSong(_id, _name, _artists, _genres, _discNumber, _albumName, _albumArtist, _albumType, _albumId, _duration, _date, _trackNumber, _publisher, _path, _images, _image, _copyright, _downloadUrl, _lyrics, _dynamicLyrics, _popularity, _dateAdded, _inDatabase, obj)
    def __getitem__(self, item):
        if item == 'id':
            return self.id
        elif item == 'name':
            return self.name
        elif item == 'artists':
            return self.artists
        elif item == 'genres':
            return self.genres
        elif item == 'discNumber':
            return self.discNumber
        elif item == 'albumName':
            return self.albumName
        elif item == 'albumArtist':
            return self.albumArtist
        elif item == 'albumType':
            return self.albumType
        elif item == 'albumId':
            return self.albumId
        elif item == 'duration':
            return self.duration
        elif item == 'date':
            return self.date
        elif item == 'trackNumber':
            return self.trackNumber
        elif item == 'publisher':
            return self.publisher
        elif item == 'path':
            return self.path
        elif item == 'images':
            return self.images
        elif item == 'image':
            return self.image
        elif item == 'copyright':
            return self.copyright
        elif item == 'downloadUrl':
            return self.downloadUrl
        elif item == 'lyrics':
            return self.lyrics
        elif item == 'dynamicLyrics':
            return self.dynamicLyrics
        elif item == 'popularity':
            return self.popularity
        elif item == 'dateAdded':
            return self.dateAdded
        elif item == 'inDatabase':
            return self.inDatabase
        return None

