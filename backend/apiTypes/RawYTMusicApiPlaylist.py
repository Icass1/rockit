from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class YTMusicPlaylistThumbnails:
    url: str
    width: int
    height: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicPlaylistThumbnails':
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        return YTMusicPlaylistThumbnails(_url, _width, _height, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        return None

@dataclass
class YTMusicPlaylistArtists:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicPlaylistArtists':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return YTMusicPlaylistArtists(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class YTMusicPlaylistAlbum:
    name: str
    id: str
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicPlaylistAlbum':
        _name = obj.get('name') if obj and 'name' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        return YTMusicPlaylistAlbum(_name, _id, obj)
    def __getitem__(self, item):
        if item == 'name':
            return self.name
        elif item == 'id':
            return self.id
        return None

@dataclass
class YTMusicPlaylistThumbnails:
    url: str
    width: int
    height: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicPlaylistThumbnails':
        _url = obj.get('url') if obj and 'url' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        return YTMusicPlaylistThumbnails(_url, _width, _height, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'width':
            return self.width
        elif item == 'height':
            return self.height
        return None

@dataclass
class YTMusicPlaylistTracks:
    videoId: str
    title: str
    artists: List[YTMusicPlaylistArtists]
    album: YTMusicPlaylistAlbum
    likeStatus: str
    inLibrary: Any
    thumbnails: List[YTMusicPlaylistThumbnails]
    isAvailable: bool
    isExplicit: bool
    videoType: str
    views: Any
    duration: str
    duration_seconds: int
    _json: dict
    def from_dict(obj: Any) -> 'YTMusicPlaylistTracks':
        _videoId = obj.get('videoId') if obj and 'videoId' in obj else None
        _title = obj.get('title') if obj and 'title' in obj else None
        _artists = [YTMusicPlaylistArtists.from_dict(k) for k in obj.get('artists')] if obj and 'artists' in obj else None
        _album = YTMusicPlaylistAlbum.from_dict(obj.get('album')) if obj and 'album' in obj else None
        _likeStatus = obj.get('likeStatus') if obj and 'likeStatus' in obj else None
        _inLibrary = obj.get('inLibrary') if obj and 'inLibrary' in obj else None
        _thumbnails = [YTMusicPlaylistThumbnails.from_dict(k) for k in obj.get('thumbnails')] if obj and 'thumbnails' in obj else None
        _isAvailable = obj.get('isAvailable') if obj and 'isAvailable' in obj else None
        _isExplicit = obj.get('isExplicit') if obj and 'isExplicit' in obj else None
        _videoType = obj.get('videoType') if obj and 'videoType' in obj else None
        _views = obj.get('views') if obj and 'views' in obj else None
        _duration = obj.get('duration') if obj and 'duration' in obj else None
        _duration_seconds = obj.get('duration_seconds') if obj and 'duration_seconds' in obj else None
        return YTMusicPlaylistTracks(_videoId, _title, _artists, _album, _likeStatus, _inLibrary, _thumbnails, _isAvailable, _isExplicit, _videoType, _views, _duration, _duration_seconds, obj)
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
        elif item == 'duration':
            return self.duration
        elif item == 'duration_seconds':
            return self.duration_seconds
        return None

@dataclass
class RawYTMusicApiPlaylist:
    owned: bool
    id: str
    privacy: str
    description: Any
    views: int
    duration: str
    trackCount: int
    title: str
    thumbnails: List[YTMusicPlaylistThumbnails]
    artists: List[Any]
    year: str
    related: List[Any]
    tracks: List[YTMusicPlaylistTracks]
    duration_seconds: int
    _json: dict
    def from_dict(obj: Any) -> 'RawYTMusicApiPlaylist':
        _owned = obj.get('owned') if obj and 'owned' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _privacy = obj.get('privacy') if obj and 'privacy' in obj else None
        _description = obj.get('description') if obj and 'description' in obj else None
        _views = obj.get('views') if obj and 'views' in obj else None
        _duration = obj.get('duration') if obj and 'duration' in obj else None
        _trackCount = obj.get('trackCount') if obj and 'trackCount' in obj else None
        _title = obj.get('title') if obj and 'title' in obj else None
        _thumbnails = [YTMusicPlaylistThumbnails.from_dict(k) for k in obj.get('thumbnails')] if obj and 'thumbnails' in obj else None
        _artists = obj.get('artists') if obj and 'artists' in obj else None
        _year = obj.get('year') if obj and 'year' in obj else None
        _related = obj.get('related') if obj and 'related' in obj else None
        _tracks = [YTMusicPlaylistTracks.from_dict(k) for k in obj.get('tracks')] if obj and 'tracks' in obj else None
        _duration_seconds = obj.get('duration_seconds') if obj and 'duration_seconds' in obj else None
        return RawYTMusicApiPlaylist(_owned, _id, _privacy, _description, _views, _duration, _trackCount, _title, _thumbnails, _artists, _year, _related, _tracks, _duration_seconds, obj)
    def __getitem__(self, item):
        if item == 'owned':
            return self.owned
        elif item == 'id':
            return self.id
        elif item == 'privacy':
            return self.privacy
        elif item == 'description':
            return self.description
        elif item == 'views':
            return self.views
        elif item == 'duration':
            return self.duration
        elif item == 'trackCount':
            return self.trackCount
        elif item == 'title':
            return self.title
        elif item == 'thumbnails':
            return self.thumbnails
        elif item == 'artists':
            return self.artists
        elif item == 'year':
            return self.year
        elif item == 'related':
            return self.related
        elif item == 'tracks':
            return self.tracks
        elif item == 'duration_seconds':
            return self.duration_seconds
        return None