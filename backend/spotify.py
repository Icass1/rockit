import requests
import re
import json
from dotenv import load_dotenv
import base64
import os
from typing import List
import re

from spotdl.types.song import Song

from api_types import RawSpotifyApiSong, RawSpotifyApiAlbum, AlbumItem
from colors import *

class Spotify:
    def __init__(self):
        load_dotenv()
        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')
        self.token: str = None
        self.get_token()

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

    def get_auth_header(self):
        return {"Authorization": "Bearer " + self.token}

    def spotdl_songs_from_url(self, url):
    
        url = self.parse_url(url)
    
        spotdl_songs: List[Song] = []
        raw_songs: List[AlbumItem] = []


        if "/album/" in url:
            raw_album = self.api_call(path=f"albums/{url.replace('https://open.spotify.com/album/', '')}")
            album = RawSpotifyApiAlbum.from_dict(raw_album)

            for song in album.tracks.items:
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
                song_dict["genres"] = album.genres
                song_dict["disc_number"] = song.disc_number
                song_dict["disc_count"] = album.tracks.items[-1].disc_number
                song_dict["duration"] = song.duration_ms/1000
                song_dict["year"] = int(album.release_date[:4])
                song_dict["date"] = album.release_date
                song_dict["track_number"] = song.track_number
                song_dict["tracks_count"] = album.total_tracks
                song_dict["isrc"] = album.external_ids.isrc
                song_dict["song_id"] = song.id
                song_dict["explicit"] = song.explicit
                song_dict["publisher"] = album.label
                song_dict["url"] = song.external_urls.spotify
                song_dict["popularity"] = album.popularity
                song_dict["cover_url"] = (
                            max(album.images, key=lambda i: i.width * i.height)[
                                "url"
                            ]
                            if album.images
                            else None
                        ),
                spotdl_songs.append(Song.from_dict(song_dict))
                raw_songs.append(song)

            return album, spotdl_songs, raw_songs

    def spotdl_song_from_url(self, url):
        url = self.parse_url(url)

        if "/track/" not in url:
            raise Exception("Invalid URL")

        raw_song = self.api_call(path=f"tracks/{url.replace('https://open.spotify.com/track/', '')}")
        song = RawSpotifyApiSong.from_dict(raw_song)

        raw_album = self.api_call(path=f"albums/{song.album.id}")
        album = RawSpotifyApiAlbum.from_dict(raw_album)

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
        song_dict["genres"] = album.genres
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
    
        return Song.from_dict(song_dict), song


    def api_call(self, path: str, params: dict = {}):

        parsed_params = ""
        
        for k in list(params.items()):
            parsed_params += "&" + k[0] + "=" + k[1]

        url = f"https://api.spotify.com/v1/{path}"
        headers = self.get_auth_header()

        query_url = url + "?" + parsed_params

        result = requests.get(query_url, headers=headers)
        if result.status_code == 401:
            print("Token espired")
            self.get_token()
            headers = self.get_auth_header()
            result = requests.get(query_url, headers=headers)

        return json.loads(result.content)

    def parse_url(self, url):
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]
