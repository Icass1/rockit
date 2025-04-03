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
    songs: List[str]
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
        _songs = obj.get('songs') if obj and 'songs' in obj else None
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

