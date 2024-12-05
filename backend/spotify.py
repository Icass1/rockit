import requests
import re
import json
import base64
import os
from typing import List
import re
from ytmusicapi import YTMusic

from spotdl.types.song import Song

from utils import sanitize_folder_name, download_image

from apiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack, TrackArtists
from apiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum, AlbumItems
from apiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist, PlaylistItems, PlaylistAlbum, PlaylistArtists
from apiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from apiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults, SpotifySearchResultsArtists1, SpotifySearchResultsItems2
from apiTypes.RawYTMusicApiPlaylist import RawYTMusicApiPlaylist, YTMusicPlaylistTracks
from apiTypes.RawYTMusicApiAlbum import RawYTMusicApiAlbum
from apiTypes.RawYTMusicApiSong import RawYTMusicApiSong

from logger import getLogger

logger = getLogger(__name__)

from spotdl.types.song import Song

class Spotify:
    def __init__(self):
        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')

        self.ytmusic = YTMusic()

        logger.info(f"CLIENT_ID: {self.client_id}")
        logger.info(f"CLIENT_SECRET: {self.client_secret}")

        if self.client_id == None or self.client_secret == None:
            logger.critical("Missing .env file")
            logger.critical("Creating a template, please fill the variables and try again")
            with open(".env", "w") as f:
                f.write("\n")
                f.write("CLIENT_ID=\n")
                f.write("CLIENT_SECRET=\n")
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
        logger.info("New token")

    def get_auth_header(self):
        return {"Authorization": "Bearer " + self.token}

    def get_spotify_album(self, url: str):
        spotdl_songs: List[Song] = []
        raw_songs: List[AlbumItems] | List[PlaylistItems] = []

        raw_album = self.api_call(path=f"albums/{url.replace('https://open.spotify.com/album/', '')}")
        album = RawSpotifyApiAlbum.from_dict(raw_album)
        self.update_album(album=album)
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

            logger.debug(f"get_spotify_album Album Spotdl song: {spotdl_song}")
            logger.debug(f"get_spotify_album Album Raw song: {song}")

        return album, spotdl_songs, raw_songs

    def get_spotify_playlist(self, url):

        spotdl_songs: List[Song] = []
        raw_songs: List[AlbumItems] | List[PlaylistItems] = []

        raw_playlist = self.api_call(path=f"playlists/{url.replace('https://open.spotify.com/playlist/', '')}")
        playlist = RawSpotifyApiPlaylist.from_dict(raw_playlist)

        for item in playlist.tracks.items:

            genres = self.get_genres(artists=item.track.artists)

            song = item.track

            song_dict = {}
            song_dict["name"] = song.name
            song_dict["artists"] = [artist.name for artist in song.artists]
            song_dict["artist"] = song.artists[0].name
            song_dict["artist_id"] = song.artists[0].id
            song_dict["album_id"] = song.album.id
            song_dict["album_name"] = song.album.name
            song_dict["album_artist"] = song.album.artists[0].name
            song_dict["album_type"] = song.album.type
            song_dict["copyright_text"]  = ""
            song_dict["genres"] = genres
            song_dict["disc_number"] = song.disc_number
            song_dict["disc_count"] = 1
            song_dict["duration"] = song.duration_ms/1000
            song_dict["year"] = int(song.album.release_date[:4])
            song_dict["date"] = song.album.release_date
            song_dict["track_number"] = song.track_number
            song_dict["tracks_count"] = song.album.total_tracks
            song_dict["isrc"] = song.external_ids.isrc
            song_dict["song_id"] = song.id
            song_dict["explicit"] = song.explicit
            song_dict["publisher"] = ""
            song_dict["url"] = song.external_urls.spotify
            song_dict["popularity"] = song.popularity
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

            logger.debug(f"get_spotify_playlist Playlist Spotdl song: {spotdl_song}")
            logger.debug(f"get_spotify_playlist Playlist Raw song: {song}")

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

    def update_album(self, album: RawSpotifyApiAlbum | PlaylistAlbum):
        
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

        requests.post(f"{os.getenv('FRONTEND_URL')}/api/new-album", json={
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
        })

    def get_genres(self, artists: List[TrackArtists] | List[PlaylistArtists] | List[SpotifySearchResultsArtists1]):
        
        genres = []

        for track_artist in artists:
            if track_artist.id in self.artists_cache:
                logger.debug(f"Spotify.get_genres Artist from cache {track_artist.id}")
                genres += self.artists_cache[track_artist.id].genres
            else:
                logger.debug(f"Spotify.get_genres Getting artist from API cache {track_artist.id}" )
                raw_artist = self.api_call(path=f"artists/{track_artist.id}")
                artist = RawSpotifyApiArtist.from_dict(raw_artist)
                self.artists_cache[track_artist.id] = artist
                genres += artist.genres

        return genres

    def get_spotify_song(self, url):

        if "/track/" not in url:
            raise Exception("Invalid URL")

        raw_song = self.api_call(path=f"tracks/{url.replace('https://open.spotify.com/track/', '')}")
        song = RawSpotifyApiTrack.from_dict(raw_song)

        raw_album = self.api_call(path=f"albums/{song.album.id}")
        album = RawSpotifyApiAlbum.from_dict(raw_album)

        self.update_album(album=album)

        genres = self.get_genres(artists=song.artists)

        # json.dump(raw_song, open("raw_spotify_song.json", "w"), indent=4)
        # json.dump(raw_album, open("raw_spotify_album.json", "w"), indent=4)

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

        logger.debug(f"spotdl_song_from_url Spotdl song: {spotdl_song}")
        logger.debug(f"spotdl_song_from_url Raw song: {song}")

        return Song.from_dict(song_dict), song

    def get_youtube_song(self, yt_song_id: str):
        raw_yt_song = self.ytmusic.get_song(videoId=yt_song_id)
        # json.dump(raw_yt_song, open("raw_yt_song.json", "w"), indent=4)

        yt_song = RawYTMusicApiSong.from_dict(raw_yt_song)

        # json.dump(self.ytmusic.search(yt_song.videoDetails.videoId), open("raw_yt_search.json", "w"), indent=4)

        search_results = self.api_call(path="search", params={"q": f"{yt_song.videoDetails.title} {yt_song.videoDetails.author}", "type": "track", "limit": "1"})
        # json.dump(search_results, open("raw_spotify_search.json", "w"), indent=4)

        raw_spotify_song = RawSpotifyApiSearchResults.from_dict(search_results)
        song = raw_spotify_song.tracks.items[0]

        raw_album = self.api_call(path=f"albums/{song.album.id}")
        album = RawSpotifyApiAlbum.from_dict(raw_album)
        self.update_album(album=album)

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

        logger.debug(f"spotdl_song_from_url Spotdl song: {spotdl_song}")
        logger.debug(f"spotdl_song_from_url Raw song: {song}")

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

        query_url = url + "?" + parsed_params

        print("====== query_url =======")
        print(query_url)
        print("========================")

        result = requests.get(query_url, headers=headers)
        if result.status_code == 401:
            logger.info("Token espired")
            # print("Token espired")
            self.get_token()
            headers = self.get_auth_header()
            result = requests.get(query_url, headers=headers)

        return json.loads(result.content)

    def parse_url(self, url):
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]
