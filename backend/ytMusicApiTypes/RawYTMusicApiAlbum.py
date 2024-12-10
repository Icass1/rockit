from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class YTMusicAlbumThumbnails:
    url: str
    width: int
    height: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicAlbumThumbnails':
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        return YTMusicAlbumThumbnails(_url, _width, _height, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        return None

@dataclass
class YTMusicAlbumArtists:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicAlbumArtists':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return YTMusicAlbumArtists(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class YTMusicAlbumArtists:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicAlbumArtists':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return YTMusicAlbumArtists(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class YTMusicAlbumTracks:
    videoId: str
    title: str
    artists: List[YTMusicAlbumArtists]
    album: str
    likeStatus: str
    inLibrary: Any
    thumbnails: Any
    isAvailable: bool
    isExplicit: bool
    videoType: str
    views: str
    trackNumber: int
    duration: str
    duration_seconds: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicAlbumTracks':
        _videoId = obj.get('videoId') if obj and 'videoId' in obj else None
        _title = obj.get('title') if obj and 'title' in obj else None
        _artists = [YTMusicAlbumArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _album = obj.get('album') if obj and 'album' in obj else None
        _likeStatus = obj.get('likeStatus') if obj and 'likeStatus' in obj else None
        _inLibrary = obj.get('inLibrary') if obj and 'inLibrary' in obj else None
        _thumbnails = obj.get('thumbnails') if obj and 'thumbnails' in obj else None
        _isAvailable = obj.get('isAvailable') if obj and 'isAvailable' in obj else None
        _isExplicit = obj.get('isExplicit') if obj and 'isExplicit' in obj else None
        _videoType = obj.get('videoType') if obj and 'videoType' in obj else None
        _views = obj.get('views') if obj and 'views' in obj else None
        _trackNumber = obj.get('trackNumber') if obj and 'trackNumber' in obj else None
        _duration = obj.get('duration') if obj and 'duration' in obj else None
        _duration_seconds = obj.get('duration_seconds') if obj and 'duration_seconds' in obj else None
        return YTMusicAlbumTracks(_videoId, _title, _artists, _album, _likeStatus, _inLibrary, _thumbnails, _isAvailable, _isExplicit, _videoType, _views, _trackNumber, _duration, _duration_seconds, obj)
    def __getitem__(self, item):
        if item == 'videoId':
            return self.videoId
        elif item == 'title':
            return self.title
        elif item == 'artists':
            return self.artists
        elif item == 'album':
            return self.album
        elif item == 'likeStatus':
            return self.likeStatus
        elif item == 'inLibrary':
            return self.inLibrary
        elif item == 'thumbnails':
            return self.thumbnails
        elif item == 'isAvailable':
            return self.isAvailable
        elif item == 'isExplicit':
            return self.isExplicit
        elif item == 'videoType':
            return self.videoType
        elif item == 'views':
            return self.views
        elif item == 'trackNumber':
            return self.trackNumber
        elif item == 'duration':
            return self.duration
        elif item == 'duration_seconds':
            return self.duration_seconds
        return None

@dataclass
class RawYTMusicApiAlbum:
    title: str
    type: str
    thumbnails: List[YTMusicAlbumThumbnails]
    isExplicit: bool
    description: str
    artists: List[YTMusicAlbumArtists]
    year: str
    trackCount: int
    duration: str
    audioPlaylistId: str
    tracks: List[YTMusicAlbumTracks]
    duration_seconds: int
    _json: dict
    def from_dict(obj: Any) -> 'RawYTMusicApiAlbum':
        _title = obj.get('title') if obj and 'title' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _thumbnails = [YTMusicAlbumThumbnails.from_dict(k) for k in obj.get('thumbnails')] if obj and 'thumbnails' in obj else None
        _isExplicit = obj.get('isExplicit') if obj and 'isExplicit' in obj else None
        _description = obj.get('description') if obj and 'description' in obj else None
        _artists = [YTMusicAlbumArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _year = obj.get('year') if obj and 'year' in obj else None
        _trackCount = obj.get('trackCount') if obj and 'trackCount' in obj else None
        _duration = obj.get('duration') if obj and 'duration' in obj else None
        _audioPlaylistId = obj.get('audioPlaylistId') if obj and 'audioPlaylistId' in obj else None
        _tracks = [YTMusicAlbumTracks.from_dict(k) for k in obj.get('tracks')] if obj and 'tracks' in obj else None
        _duration_seconds = obj.get('duration_seconds') if obj and 'duration_seconds' in obj else None
        return RawYTMusicApiAlbum(_title, _type, _thumbnails, _isExplicit, _description, _artists, _year, _trackCount, _duration, _audioPlaylistId, _tracks, _duration_seconds, obj)
    def __getitem__(self, item):
        if item == 'title':
            return self.title
        elif item == 'type':
            return self.type
        elif item == 'thumbnails':
            return self.thumbnails
        elif item == 'isExplicit':
            return self.isExplicit
        elif item == 'description':
            return self.description
        elif item == 'artists':
            return self.artists
        elif item == 'year':
            return self.year
        elif item == 'trackCount':
            return self.trackCount
        elif item == 'duration':
            return self.duration
        elif item == 'audioPlaylistId':
            return self.audioPlaylistId
        elif item == 'tracks':
            return self.tracks
        elif item == 'duration_seconds':
            return self.duration_seconds
        return None