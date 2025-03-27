import requests
import re
import json
import base64
import os
from typing import List
import re
from ytmusicapi import YTMusic
import math

from spotdl.types.song import Song

from backendUtils import sanitize_folder_name, download_image

from spotifyApiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack, TrackArtists
from spotifyApiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum, AlbumItems
from spotifyApiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist, PlaylistItems, PlaylistAlbum, PlaylistArtists, PlaylistTracks
from spotifyApiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults, SpotifySearchResultsArtists1, SpotifySearchResultsItems2
from ytMusicApiTypes.RawYTMusicApiPlaylist import RawYTMusicApiPlaylist
from ytMusicApiTypes.RawYTMusicApiAlbum import RawYTMusicApiAlbum
from ytMusicApiTypes.RawYTMusicApiSong import RawYTMusicApiSong
from rockItApiTypes.RawRockItApiAlbum import RawRockItApiAlbum
from rockItApiTypes.RawRockItApiSong import RawRockItApiSong

from db.db import DB

from logger import getLogger

logger = getLogger(__name__)

from spotdl.types.song import Song

class Spotify:
    def __init__(self, db: DB):
        
        self.db = db
        
        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')

        self.ytmusic = YTMusic()

        if self.client_id == None or self.client_secret == None:
            logger.critical("Missing .env file")
            exit()

        self.token: str = None
        self.get_token()


        self.artists_cache = {}

    def get_token(self):
        auth_string = self.client_id + ':' + self.client_secret
        auth_bytes = auth_string.encode('utf-8')
        auth_base64 = str(base64.b64encode(auth_bytes), "utf-8")

        url = "https://accounts.spotify.com/api/token"
        headers = {
            "Authorization": "Basic " + auth_base64,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {"grant_type": "client_credentials"}

        result = requests.post(url, headers=headers, data=data)
        json_response = json.loads(result.content)

        self.token = json_response["access_token"]
        logger.info("Spotify.get_token New token")

    def get_auth_header(self):
        return {"Authorization": "Bearer " + self.token}

    def get_spotify_album(self, url: str):
        spotdl_songs: List[Song] = []
        raw_songs: List[AlbumItems] | List[PlaylistItems] = []

        album = self.get_album(id=url.replace('https://open.spotify.com/album/', ''))

        self.update_album_db(album=album)
        raw_album_tracks = [RawSpotifyApiTrack.from_dict(song) for song in self.api_call(path="tracks", params={"ids": ",".join([item.id for item in album.tracks.items])})["tracks"]]

        for song in raw_album_tracks:

            genres = self.get_genres(song.artists)

            song_dict = {}
            song_dict["name"] = song.name
            song_dict["artists"] = [artist.name for artist in song.artists]
            song_dict["artist"] = song.artists[0].name
            song_dict["artist_id"] = song.artists[0].id
            song_dict["album_id"] = album.id
            song_dict["album_name"] = album.name
            song_dict["album_artist"] = album.artists[0].name
            song_dict["album_type"] = album.type
            song_dict["copyright_text"]  = album.copyrights[0].text
            song_dict["genres"] = genres
            song_dict["disc_number"] = song.disc_number
            song_dict["disc_count"] = album.tracks.items[-1].disc_number
            song_dict["duration"] = song.duration_ms/1000
            song_dict["year"] = int(album.release_date[:4])
            song_dict["date"] = album.release_date
            song_dict["track_number"] = song.track_number
            song_dict["tracks_count"] = album.total_tracks
            song_dict["isrc"] = song.external_ids.isrc
            song_dict["song_id"] = song.id
            song_dict["explicit"] = song.explicit
            song_dict["publisher"] = album.label
            song_dict["url"] = song.external_urls.spotify
            song_dict["popularity"] = album.popularity
            song_dict["cover_url"] =  max(album.images, key=lambda i: i.width * i.height)["url"] if album.images else None

            spotdl_song = Song.from_dict(song_dict)

            spotdl_songs.append(spotdl_song)
            raw_songs.append(song)

            logger.debug(f"Spotify.get_spotify_album Album Spotdl song: {spotdl_song}")
            logger.debug(f"Spotify.get_spotify_album Album Raw song: {song}")

        return album, spotdl_songs, raw_songs

    def get_spotify_playlist(self, url):

        spotdl_songs: List[Song] = []
        raw_songs: List[AlbumItems] | List[PlaylistItems] = []

        tracks: List[PlaylistItems] = []

        raw_playlist_tracks = self.api_call(path=f"playlists/{url.replace('https://open.spotify.com/playlist/', '')}/tracks", params={"limit": "100"})
        playlist_tracks = PlaylistTracks.from_dict(raw_playlist_tracks)

        tracks += playlist_tracks.items

        while playlist_tracks.next:
            raw_playlist_tracks = self.api_call(path=playlist_tracks.next.replace("https://api.spotify.com/v1/", ""))
            playlist_tracks = PlaylistTracks.from_dict(raw_playlist_tracks)
            tracks += playlist_tracks.items

        raw_playlist = self.api_call(path=f"playlists/{url.replace('https://open.spotify.com/playlist/', '')}")
        if "error" in raw_playlist:
            return raw_playlist

        playlist = RawSpotifyApiPlaylist.from_dict(raw_playlist)
        playlist.tracks.items = tracks

        artist_ids = []
        for song in playlist.tracks.items:
            if song.track == None: 
                logger.warning(f"Spotify.get_spotify_playlist Removing song from items beacuse is None {song}")
                playlist.tracks.items.remove(song)
                continue
            for artist in song.track.artists:
                artist_ids.append(artist.id)

        artist_ids = list(set(artist_ids))

        for k in range(math.ceil(len(artist_ids)/50)):
            raw_artists = self.api_call(path=f"artists", params={"ids": ','.join(artist_ids[k*50 : (k+1)*50])})
            if "artists" in raw_artists:
                for artist in raw_artists["artists"]:
                    artist = RawSpotifyApiArtist.from_dict(artist)
                    self.artists_cache[artist.id] = artist
            else:
                artist = RawSpotifyApiArtist.from_dict(raw_artists)
                self.artists_cache[artist.id] = artist

        for item in playlist.tracks.items:

            genres = self.get_genres(artists=item.track.artists)

            song = item.track

            song_dict = {}
            song_dict["name"] = song.name
            song_dict["artists"] = [artist.name for artist in song.artists]
            song_dict["artist"] = song.artists[0].name
            song_dict["artist_id"] = song.artists[0].id
            song_dict["copyright_text"]  = ""
            song_dict["genres"] = genres
            song_dict["disc_number"] = song.disc_number
            song_dict["disc_count"] = 1
            song_dict["duration"] = song.duration_ms/1000
            song_dict["track_number"] = song.track_number
            song_dict["isrc"] = song.external_ids.isrc
            song_dict["song_id"] = song.id
            song_dict["explicit"] = song.explicit
            song_dict["publisher"] = ""
            song_dict["url"] = song.external_urls.spotify
            song_dict["popularity"] = song.popularity
            if song.album == None:
                logger.error(f"Spotify.get_spotify_playlist No album found in song. {song=}")
            else:
                song_dict["album_type"] = song.album.type
                song_dict["album_id"] = song.album.id
                song_dict["album_name"] = song.album.name
                song_dict["album_artist"] = song.album.artists[0].name
                if song.album.release_date: song_dict["year"] = int(song.album.release_date[:4])
                else: logger.error(f"Spotify.get_spotify_playlist No release_date found in song album. {song.album=}")
                song_dict["date"] = song.album.release_date
                song_dict["tracks_count"] = song.album.total_tracks
                song_dict["cover_url"] = (
                            max(song.album.images, key=lambda i: i.width * i.height)[
                                "url"
                            ]
                            if song.album.images
                            else None
                        ),
            
            spotdl_song = Song.from_dict(song_dict)
            spotdl_songs.append(spotdl_song)
            raw_songs.append(item)

            logger.debug(f"Spotify.get_spotify_playlist Playlist Spotdl song: {spotdl_song}")
            logger.debug(f"Spotify.get_spotify_playlist Playlist Raw song: {song}")

        return playlist, spotdl_songs, raw_songs

    def get_youtube_playlist(self, raw_playlist):

        playlist = RawYTMusicApiPlaylist.from_dict(raw_playlist)
        
        spotdl_songs: List[Song] = []
        raw_songs: List[AlbumItems] | List[PlaylistItems] = []

        tracks = []
       
        for yt_song in playlist.tracks:
            search_results = self.api_call(path="search", params={"q": f"{yt_song.title} - {yt_song.album.name} - {', '.join([artist.name for artist in yt_song.artists])}", "type": "track", "limit": "1"})
            
            raw_song = search_results["tracks"]["items"][0]
            song = PlaylistItems.from_dict({
                "added_at":  None,
                "added_by": {
                    "external_urls": {
                        "spotify":  None
                    },
                    "followers": {
                        "href":  None,
                        "total":  None
                    },
                    "href": None,
                    "id": None,
                    "type": None,
                    "uri": None
                },
                "is_local": None,
                "track": raw_song
            })
            
            song_info = song.track
            
            genres = self.get_genres(artists=song_info.artists)

            song_dict = {}
            song_dict["name"] = song_info.name
            song_dict["artists"] = [artist.name for artist in song_info.artists]
            song_dict["artist"] = song_info.artists[0].name
            song_dict["artist_id"] = song_info.artists[0].id
            song_dict["album_id"] = song_info.album.id
            song_dict["album_name"] = song_info.album.name
            song_dict["album_artist"] = song_info.album.artists[0].name
            song_dict["album_type"] = song_info.album.type
            song_dict["copyright_text"]  = ""
            song_dict["genres"] = genres
            song_dict["disc_number"] = song_info.disc_number
            song_dict["disc_count"] = 1
            song_dict["duration"] = song_info.duration_ms/1000
            song_dict["year"] = int(song_info.album.release_date[:4])
            song_dict["date"] = song_info.album.release_date
            song_dict["track_number"] = song_info.track_number
            song_dict["tracks_count"] = song_info.album.total_tracks
            song_dict["isrc"] = song_info.external_ids.isrc
            song_dict["song_id"] = song_info.id
            song_dict["explicit"] = song_info.explicit
            song_dict["publisher"] = ""
            song_dict["url"] = song_info.external_urls.spotify
            song_dict["popularity"] = song_info.popularity
            song_dict["cover_url"] = (
                        max(song_info.album.images, key=lambda i: i.width * i.height)[
                            "url"
                        ]
                        if song_info.album.images
                        else None
                    ),
            
            spotdl_song = Song.from_dict(song_dict)
            spotdl_songs.append(spotdl_song)
            raw_songs.append(song)
            
            
            
            tracks.append(song._json)
            

        raw_spotify_playlist = {
            "collaborative": False,
            "description": playlist.description,
            "external_urls": {
                "spotify": None
            },
            "followers": {
                "href": None,
                "total": playlist.views
            },
            "href": None,
            "id": playlist.id,
            "images":  [{"url": thumbnail.url, "height": thumbnail.height, "width": thumbnail.width} for thumbnail in playlist.thumbnails],
            "name": playlist.title,
            "owner": {
                "external_urls": {
                    "spotify":None
                },
                "followers": {
                    "href": None,
                    "total": None
                },
                "href": None,
                "id": None,
                "type": "user",
                "uri": None,
                "display_name": "YTMusic"
            },
            "public": True,
            "snapshot_id": None,
            "tracks": {
                "href": None,
                "limit": None,
                "next": None,
                "offset": None,
                "previous": None,
                "total": None,
                "items": tracks
            },
            "type": "playlist",
            "uri": None
        }

        spotify_playlist = RawSpotifyApiPlaylist.from_dict(raw_spotify_playlist)

        return spotify_playlist, spotdl_songs, raw_songs

    def get_youtube_album(self, raw_album):
        yt_album = RawYTMusicApiAlbum.from_dict(raw_album)
        search_results = self.api_call(path="search", params={"q": f"{yt_album.title} - {', '.join([artist.name for artist in yt_album.artists])}", "type": "album", "limit": "1"})
        spotify_album = SpotifySearchResultsItems2.from_dict(search_results["albums"]["items"][0])

        return self.get_spotify_album(spotify_album.external_urls.spotify)
    
    def spotdl_songs_from_url(self, url):
        if "open.spotify.com" in url and "/album/" in url:
            return self.get_spotify_album(url=self.parse_url(url))
        if "open.spotify.com" in url and "/playlist/" in url:
            return self.get_spotify_playlist(url=self.parse_url(url))
        if "music.youtube.com" in url and "/playlist" in url:
            list_id = url.split("list=")[-1].split("&")[0]
            try:
                raw_playlist = self.ytmusic.get_playlist(playlistId=list_id)
                return self.get_youtube_playlist(raw_playlist=raw_playlist)
            except:
                try:
                    yt_album_id = self.ytmusic.get_album_browse_id(list_id)
                    raw_album = self.ytmusic.get_album(yt_album_id)
                except:
                    raise Exception("Error getting album")
                return self.get_youtube_album(raw_album=raw_album)
        raise Exception("Invalid URL")

    def update_album_db(self, album: RawSpotifyApiAlbum | PlaylistAlbum):

        if len(album.images) > 1:
            image_url = max(album.images, key=lambda i: i.width * i.height)["url"] if album.images else None
        else:
            image_url = album.images[0].url

        image_path_dir = os.path.join("album", sanitize_folder_name(album.artists[0].name), sanitize_folder_name(album.name))
        image_path = os.path.join(image_path_dir, "image.png")

        if not os.path.exists(os.path.join(os.getenv("IMAGES_PATH"), image_path_dir)):
            os.makedirs(os.path.join(os.getenv("IMAGES_PATH"), image_path_dir))
        if not os.path.exists(os.path.join(os.getenv("IMAGES_PATH"), image_path)):
            download_image(url=image_url, path=os.path.join(os.getenv("IMAGES_PATH"), image_path))

        logger.info(f"Spotfy.update_album_db image_path={image_path}")

        requests.post(f"{os.getenv('FRONTEND_URL')}/api/album/new", json={
            "id": album.id,
            "images": [image._json for image in album.images],
            "image": image_path,
            "name": album.name,
            "release_date": album.release_date,
            "type": album.type,
            "artists": [{"name": artist.name, "id": artist.id} for artist in album.artists],
            "copyrights": [_copyright._json for _copyright in album.copyrights],
            "popularity": album.popularity,
            "genres": album.genres,
            "songs": [song.id for song in album.tracks.items],
            "disc_count": max([song.disc_number for song in album.tracks.items])
        }, headers={"Authorization": f"Bearer {os.getenv('API_KEY')}"})

    def get_genres(self, artists: List[TrackArtists] | List[PlaylistArtists] | List[SpotifySearchResultsArtists1]):
        genres = []

        for track_artist in artists:
            if track_artist.id in self.artists_cache:
                logger.debug(f"Spotify.get_genres Artist from cache {track_artist.id}")
                if self.artists_cache[track_artist.id].genres:
                    genres += self.artists_cache[track_artist.id].genres
                else:
                    logger.error(f"Spotify.get_genres artist {track_artist.id} doesn't have genres.")
            else:
                logger.debug(f"Spotify.get_genres Getting artist from API cache {track_artist.id}" )
                raw_artist = self.api_call(path=f"artists/{track_artist.id}")
                artist = RawSpotifyApiArtist.from_dict(raw_artist)
                self.artists_cache[track_artist.id] = artist
                if artist.genres:
                    genres += artist.genres
                else:
                    logger.error(f"Spotify.get_genres artist {artist.id} doesn't have genres.")
        return genres

    def get_spotify_song(self, url):

        if "/track/" not in url:
            raise Exception("Invalid URL")

        song = self.get_song(url.replace('https://open.spotify.com/track/', ''))
        album = self.get_album(song.album.id)

        self.update_album_db(album=album)

        genres = self.get_genres(artists=song.artists)

        song_dict = {}

        song_dict["name"] = song.name
        song_dict["artists"] = [artist.name for artist in song.artists]
        song_dict["artist"] = song.artists[0].name
        song_dict["artist_id"] = song.artists[0].id
        song_dict["album_id"] = album.id
        song_dict["album_name"] = album.name
        song_dict["album_artist"] = album.artists[0].name
        song_dict["album_type"] = album.type
        song_dict["copyright_text"]  = album.copyrights[0].text
        song_dict["genres"] = genres
        song_dict["disc_number"] = song.disc_number
        song_dict["disc_count"] = album.tracks.items[-1].disc_number
        song_dict["duration"] = song.duration_ms/1000
        song_dict["year"] = int(album.release_date[:4])
        song_dict["date"] = album.release_date
        song_dict["track_number"] = song.track_number
        song_dict["tracks_count"] = album.total_tracks
        song_dict["isrc"] = song.external_ids.isrc
        song_dict["song_id"] = song.id
        song_dict["explicit"] = song.explicit
        song_dict["publisher"] = album.label
        song_dict["url"] = song.external_urls.spotify
        song_dict["popularity"] = song.popularity
        song_dict["cover_url"] = (
                    max(album.images, key=lambda i: i.width * i.height)[
                        "url"
                    ]
                    if album.images
                    else None
                ),
    
        spotdl_song = Song.from_dict(song_dict)

        logger.debug(f"Spotify.get_spotify_song Spotdl song: {spotdl_song}")
        logger.debug(f"Spotify.get_spotify_song Raw song: {song}")

        return Song.from_dict(song_dict), song

    def get_album(self, id: str, force_spotify_request=False) -> RawSpotifyApiAlbum:
        if force_spotify_request:
            logger.debug("Spotify.get_album force_spotify_request")
            album = self.get_spotify_album(f"https://open.spotify.com/album/{id}")[0]
            self.update_album_db(album)
            
            return album

        raw_rockit_ablum = requests.get(f"{os.getenv('FRONTEND_URL')}/api/album/{id}")

        if raw_rockit_ablum.status_code != 200:
            logger.error(f"Spotify.get_album GET {os.getenv('FRONTEND_URL')}/api/album/{id} resulted in {raw_rockit_ablum.status_code} {raw_rockit_ablum.content}")
            album = self.get_spotify_album(f"https://open.spotify.com/album/{id}")[0]
            return album

        logger.debug(f"Spotify.get_album raw_rockit_ablum.content {raw_rockit_ablum.content}")
        rockit_album = RawRockItApiAlbum.from_dict(json.loads(raw_rockit_ablum.content))

        genres = []

        for song in rockit_album.songs:
            if not song.genres: continue
            for genre in song.genres:
                genres.append(genre)

        genres = list(set(genres))

        raw_album = {
            "album_type": "compilation",
            "total_tracks": len(rockit_album.songs),
            "available_markets": [],
            "external_urls": {
                "spotify": f"https://open.spotify.com/album/{rockit_album.id}"
            },
            "href": "",
            "id": rockit_album.id,
            "images": [image._json for image in rockit_album.images],
            "name": rockit_album.name,
            "release_date": rockit_album.releaseDate,
            "release_date_precision": "year",
            "restrictions": {},
            "type": rockit_album.type,
            "uri": "",
            "artists": [artist._json for artist in rockit_album.artists],
            "tracks": {
                "href": "",
                "limit": 0,
                "next": "",
                "offset": 0,
                "previous": "",
                "total": len(rockit_album.songs),
                "items": [{
                    "artists": [artist._json for artist in song.artists],
                    "available_markets": [],
                    "disc_number": song.discNumber,
                    "duration_ms": song.duration*1000,
                    "explicit": False,
                    "external_urls": {
                        "spotify": f"https://open.spotfiy.com/track/{song.id}"
                    },
                    "href": "",
                    "id": song.id,
                    "is_playable": True,
                    "linked_from": {
                        "external_urls": {
                            "spotify": ""
                        },
                        "href": "",
                        "id": "",
                        "type": "",
                        "uri": ""
                    },
                    "restrictions": {
                        "reason": ""
                    },
                    "name": song.name,
                    "preview_url": "",
                    "track_number": song.trackNumber,
                    "type": "track",
                    "uri": f"spotify:track:{song.id}",
                    "is_local": False
                } for song in rockit_album.songs]
            },
            "copyrights": [_copyright._json for _copyright in rockit_album.copyrights],
            "external_ids": {
                "isrc": "",
                "ean": "",
                "upc": ""
            },
            "genres": genres,
            "label": "",
            "popularity": rockit_album.popularity
        }

        album = RawSpotifyApiAlbum.from_dict(raw_album)
        return album


    def get_song(self, id: str, album: RawSpotifyApiAlbum | None = None, force_spotify_request=False) -> RawSpotifyApiTrack:
        
        if not force_spotify_request: raw_rockit_song = requests.get(f"{os.getenv('FRONTEND_URL')}/api/song/{id}")

        if force_spotify_request or raw_rockit_song.status_code != 200:
            logger.error(f"Spotify.get_album GET {os.getenv('FRONTEND_URL')}/api/song/{id} resulted in {raw_rockit_song.status_code} {raw_rockit_song.content}")
        
            raw_song = self.api_call(path=f"tracks/{id}")
            song = RawSpotifyApiTrack.from_dict(raw_song)
            
            if not album:
                album = self.get_album(song.album.id)
            
            relative_image_path = os.path.join("album", sanitize_folder_name(song.artists[0].name), sanitize_folder_name(song.album.name), "image.png")
        
            requests.post(f"{os.getenv('FRONTEND_URL')}/api/song/new", json={
                "name": song.name,
                "artists": song,
                "genres": song.genres,
                "disc_number": song.disc_number,
                "album_name": song.album_name,
                "album_artists": [artist._json for artist in song.artists],
                "album_type": song.album_type,
                "duration": song.duration,
                "year": song.year,
                "date": song.date,
                "track_number": song.track_number,
                "tracks_count": song.tracks_count,
                "song_id": song.song_id,
                "publisher": song.publisher,
                "path": None,
                "image": relative_image_path,
                "images": album.images,
                "copyright":  album.copyrights[0].text,
                "download_url": None,
                "lyrics": None,
                "popularity": song.popularity,
                "album_id": album.id,
            }, headers={"Authorization": f"Bearer {os.getenv('API_KEY')}"})
            
            return song
      
        logger.debug(f"Spotify.get_song raw_rockit_song.content {raw_rockit_song.content}")
        rockit_song = RawRockItApiSong.from_dict(json.loads(raw_rockit_song.content))

        if not album:
            album = self.get_album(rockit_song.albumId)
            
        song = RawSpotifyApiTrack.from_dict({
            "album": album._json,
            "artists": [artist._json for artist in rockit_song.artists],
            "external_urls": {
                "spotify": f"https://open.spotify.com/track/{rockit_song.id}"
            },
            "href": f"https://open.spotify.com/track/{rockit_song.id}",
            "id": song.id,
            "is_playable": True,
            "linked_from": {},
            "name": rockit_song.name,
            "popularity":  rockit_song.popularity,
            "preview_url": "string",
            "track_number": rockit_song.trackNumber,
            "type": "track",
            "uri": f"spotify:track:{rockit_song.id}",
            "is_local": False
        }) 
        
        return song

    def get_youtube_song(self, yt_song_id: str):
        raw_yt_song = self.ytmusic.get_song(videoId=yt_song_id)
        # json.dump(raw_yt_song, open("raw_yt_song.json", "w"), indent=4)

        yt_song = RawYTMusicApiSong.from_dict(raw_yt_song)

        # json.dump(self.ytmusic.search(yt_song.videoDetails.videoId), open("raw_yt_search.json", "w"), indent=4)

        search_results = self.api_call(path="search", params={"q": f"{yt_song.videoDetails.title} {yt_song.videoDetails.author}", "type": "track", "limit": "1"})
        # json.dump(search_results, open("raw_spotify_search.json", "w"), indent=4)

        raw_spotify_song = RawSpotifyApiSearchResults.from_dict(search_results)
        song = raw_spotify_song.tracks.items[0]

        album = self.get_album(song.album.id)
        self.update_album_db(album=album)

        genres = self.get_genres(artists=song.artists)

        song_dict = {}

        song_dict["name"] = song.name
        song_dict["artists"] = [artist.name for artist in song.artists]
        song_dict["artist"] = song.artists[0].name
        song_dict["artist_id"] = song.artists[0].id
        song_dict["album_id"] = album.id
        song_dict["album_name"] = album.name
        song_dict["album_artist"] = album.artists[0].name
        song_dict["album_type"] = album.type
        song_dict["copyright_text"]  = album.copyrights[0].text
        song_dict["genres"] = genres
        song_dict["disc_number"] = song.disc_number
        song_dict["disc_count"] = album.tracks.items[-1].disc_number
        song_dict["duration"] = song.duration_ms/1000
        song_dict["year"] = int(album.release_date[:4])
        song_dict["date"] = album.release_date
        song_dict["track_number"] = song.track_number
        song_dict["tracks_count"] = album.total_tracks
        song_dict["isrc"] = song.external_ids.isrc
        song_dict["song_id"] = song.id
        song_dict["explicit"] = song.explicit
        song_dict["publisher"] = ""
        song_dict["url"] = song.external_urls.spotify
        song_dict["popularity"] = song.popularity
        song_dict["cover_url"] = (
                    max(album.images, key=lambda i: i.width * i.height)[
                        "url"
                    ]
                    if album.images
                    else None
                ),
    
        spotdl_song = Song.from_dict(song_dict)

        logger.debug(f"Spotify.get_youtube_song Spotdl song: {spotdl_song}")
        logger.debug(f"Spotify.get_youtube_song Raw song: {song}")

        return Song.from_dict(song_dict), song

    def spotdl_song_from_url(self, url):
        if "open.spotify.com" in url and "/track/" in url:
            return self.get_spotify_song(url=self.parse_url(url))
        if "music.youtube.com" in url and "/watch?v=" in url:
            yt_song_id = url.split("watch?v=")[1].split("&")[0]

            return self.get_youtube_song(yt_song_id=yt_song_id)

    def api_call(self, path: str, params: dict = {}) -> dict:

        parsed_params = ""
        
        for index, k in enumerate(list(params.items())):
            if index != 0:
                parsed_params += "&"
            parsed_params += k[0] + "=" + k[1]

        url = f"https://api.spotify.com/v1/{path}"
        headers = self.get_auth_header()

        query_url = url + ("?" + parsed_params if len(parsed_params) > 0 else "")


        logger.debug(f"Spotify.api_call query_url {query_url}")


        result = requests.get(query_url, headers=headers)
        if result.status_code == 401:
            logger.info("Token espired")
            self.get_token()
            headers = self.get_auth_header()
            result = requests.get(query_url, headers=headers)

        try: return json.loads(result.content)
        except: 
            logger.critical(f"Spotify.api_call unable to load json. content: {result.content}, text: {result.text}")


    def parse_url(self, url):
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]



def main():
    
    
    db = DB()
    
    spotify = Spotify(db)
    
    spotify.get_spotify_album("")
    
    
    
    
    print(spotify)

if __name__ == "__main__":
    main()