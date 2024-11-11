from spotdl.utils.search import QueryError, create_ytm_album, create_ytm_playlist, logger
from spotdl.utils.spotify import SpotifyClient
from spotdl.utils.config import SPOTIFY_OPTIONS

from spotdl.types.song import Song, SongList
from spotdl.types.album import Album
from spotdl.types.playlist import Playlist
from spotdl.types.artist import Artist
from spotdl.types.saved import Saved

from typing import List
import re

class Spotify:
    def __init__(self):
        self.spotify_client = SpotifyClient.init(**SPOTIFY_OPTIONS)

    def get_simple_songs(
        self,
        request: str,
        use_ytm_data: bool = False,
        playlist_numbering: bool = False,
    ):
        """
        Parse query and return list containing simple song objects

        ### Arguments
        - query: List of strings containing query

        ### Returns
        - List of simple song objects
        """

        request = re.sub(r"\/intl-\w+\/", "/", request)

        songs: List[Song] = []

        if (
            "https://music.youtube.com/playlist?list=" in request
            or "https://music.youtube.com/browse/VLPL" in request
        ):
            split_urls = request.split("|")
            if len(split_urls) == 1:
                if "?list=OLAK5uy_" in request:
                    song_list = create_ytm_album(request, fetch_songs=False)
                elif "?list=PL" in request or "browse/VLPL" in request:
                    song_list = create_ytm_playlist(request, fetch_songs=False)
            else:
                if ("spotify" not in split_urls[1]) or not any(
                    x in split_urls[0]
                    for x in ["?list=PL", "?list=OLAK5uy_", "browse/VLPL"]
                ):
                    raise QueryError(
                        'Incorrect format used, please use "YouTubeMusicURL|SpotifyURL". '
                        "Currently only supports YouTube Music playlists and albums."
                    )

                if ("open.spotify.com" in request and "album" in request) and (
                    "?list=OLAK5uy_" in request
                ):
                    ytm_list: SongList = create_ytm_album(
                        split_urls[0], fetch_songs=False
                    )
                    spot_list = Album.from_url(split_urls[1], fetch_songs=False)
                elif ("open.spotify.com" in request and "playlist" in request) and (
                    "?list=PL" in request or "browse/VLPL" in request
                ):
                    ytm_list = create_ytm_playlist(split_urls[0], fetch_songs=False)
                    spot_list = Playlist.from_url(split_urls[1], fetch_songs=False)
                else:
                    raise QueryError(
                        f"URLs are not of the same type, {split_urls[0]} is not "
                        f"the same type as {split_urls[1]}."
                    )

                if ytm_list.length != spot_list.length:
                    raise QueryError(
                        f"The YouTube Music ({ytm_list.length}) "
                        f"and Spotify ({spot_list.length}) lists have different lengths. "
                    )

                if use_ytm_data:
                    for index, song in enumerate(ytm_list.songs):
                        song.url = spot_list.songs[index].url

                    song_list = ytm_list
                else:
                    for index, song in enumerate(spot_list.songs):
                        song.download_url = ytm_list.songs[index].download_url

                    song_list = spot_list
        elif "open.spotify.com" in request and "playlist" in request:
            song_list = Playlist.from_url(request, fetch_songs=False)
        elif "open.spotify.com" in request and "album" in request:
            song_list = Album.from_url(request, fetch_songs=False)
        elif "open.spotify.com" in request and "artist" in request:
            song_list = Artist.from_url(request, fetch_songs=False)
        elif "album:" in request:
            song_list = Album.from_search_term(request, fetch_songs=False)
        elif "playlist:" in request:
            song_list = Playlist.from_search_term(request, fetch_songs=False)
        elif "artist:" in request:
            song_list = Artist.from_search_term(request, fetch_songs=False)
        elif request == "saved":
            song_list = Saved.from_url(request, fetch_songs=False)
        else:
            print("Error", request)
        logger.info(
            "Found %s songs in %s (%s)",
            len(song_list.urls),
            song_list.name,
            song_list.__class__.__name__,
        )

        for index, song in enumerate(song_list.songs):
            song_data = song.json
            song_data["list_name"] = song_list.name
            song_data["list_url"] = song_list.url
            song_data["list_position"] = index + 1
            song_data["list_length"] = song_list.length

            if playlist_numbering:
                song_data["track_number"] = song_data["list_position"]
                song_data["tracks_count"] = song_data["list_length"]
                song_data["album_name"] = song_data["list_name"]
                song_data["disc_number"] = 1
                song_data["disc_count"] = 1
                if isinstance(song_list, Playlist):
                    song_data["album_artist"] = song_list.author_name
                    song_data["cover_url"] = song_list.cover_url

            songs.append(Song.from_dict(song_data))

        return songs, song_list
    
    def spotify_search(self, query):
        
        result = self.spotify_client.search(q=query, type="album,playlist,track")

        out = {"albums": [], "playlists": [], "songs": []}

        for k in result["albums"]["items"]:
            
            album = {}
            
            album["name"] = k["name"]
            album["type"] = "album"
            album["id"] = k["id"]
            album["release_date"] = k["release_date"]
            album["total_tracks"] = k["total_tracks"]
            album["spotify_url"] = k["external_urls"]["spotify"]
            if len(k["images"]) != 0: 
                album["image_url"] = k["images"][0]["url"] 
            else:
                album["image_url"] = None
            album["artists"] = [{"name": artist["name"], "type": artist["type"]} for artist in k["artists"]]
                
            out["albums"].append(album)
        
        for k in result["playlists"]["items"]:
    
            playlist = {}
            
            playlist["name"] = k["name"]
            playlist["type"] = "playlist"
            playlist["id"] = k["id"]
            playlist["release_date"] = None
            playlist["total_tracks"] = k["tracks"]["total"]
            playlist["spotify_url"] = k["external_urls"]["spotify"]

            if len(k["images"]) != 0: 
                playlist["image_url"] = k["images"][0]["url"] 
            else:
                playlist["image_url"] = None

            playlist["artists"] = [{"name": k["owner"]["display_name"]}]
                
            out["playlists"].append(playlist)
    
        for k in result["tracks"]["items"]:
    
            song = {}
            
            song["name"] = k["name"]
            song["type"] = "song"
            song["release_date"] = None
            song["id"] = k["id"]
            song["total_tracks"] = None
            song["image_url"] = k["album"]["images"][0]["url"]
            song["artists"] = [{"name": artist["name"], "type": artist["type"]} for artist in k["artists"]]
            song["spotify_url"] = k["external_urls"]["spotify"]
                
            out["songs"].append(song)
        
        return out