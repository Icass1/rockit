from typing import List, Any
from dataclasses import dataclass

@dataclass
class SpotifyArtistExternalUrls:
    spotify: str
    _json: dict
    def from_dict(obj: Any) -> 'SpotifyArtistExternalUrls':
        _spotify = obj.get('spotify') if obj and 'spotify' in obj else None
        return SpotifyArtistExternalUrls(_spotify, obj)
    def __getitem__(self, item):
        if item == 'spotify':
            return self.spotify
        return None

@dataclass
class SpotifyArtistFollowers:
    href: str
    total: int
    _json: dict
    def from_dict(obj: Any) -> 'SpotifyArtistFollowers':
        _href = obj.get('href') if obj and 'href' in obj else None
        _total = obj.get('total') if obj and 'total' in obj else None
        return SpotifyArtistFollowers(_href, _total, obj)
    def __getitem__(self, item):
        if item == 'href':
            return self.href
        elif item == 'total':
            return self.total
        return None

@dataclass
class SpotifyArtistImages:
    url: str
    height: int
    width: int
    _json: dict
    def from_dict(obj: Any) -> 'SpotifyArtistImages':
        _url = obj.get('url') if obj and 'url' in obj else None
        _height = obj.get('height') if obj and 'height' in obj else None
        _width = obj.get('width') if obj and 'width' in obj else None
        return SpotifyArtistImages(_url, _height, _width, obj)
    def __getitem__(self, item):
        if item == 'url':
            return self.url
        elif item == 'height':
            return self.height
        elif item == 'width':
            return self.width
        return None

@dataclass
class RawSpotifyApiArtist:
    external_urls: SpotifyArtistExternalUrls
    followers: SpotifyArtistFollowers
    genres: List[str]
    href: str
    id: str
    images: List[SpotifyArtistImages]
    name: str
    popularity: int
    type: str
    uri: str
    _json: dict
    def from_dict(obj: Any) -> 'RawSpotifyApiArtist':
        _external_urls = SpotifyArtistExternalUrls.from_dict(obj.get('external_urls')) if obj and 'external_urls' in obj else None
        _followers = SpotifyArtistFollowers.from_dict(obj.get('followers')) if obj and 'followers' in obj else None
        _genres = obj.get('genres') if obj and 'genres' in obj else None
        _href = obj.get('href') if obj and 'href' in obj else None
        _id = obj.get('id') if obj and 'id' in obj else None
        _images = [SpotifyArtistImages.from_dict(k) for k in obj.get('images')] if obj and 'images' in obj else None
        _name = obj.get('name') if obj and 'name' in obj else None
        _popularity = obj.get('popularity') if obj and 'popularity' in obj else None
        _type = obj.get('type') if obj and 'type' in obj else None
        _uri = obj.get('uri') if obj and 'uri' in obj else None
        return RawSpotifyApiArtist(_external_urls, _followers, _genres, _href, _id, _images, _name, _popularity, _type, _uri, obj)
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

