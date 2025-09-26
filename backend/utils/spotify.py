import os
import re
import json
import math
import base64
import requests
from logging import Logger
from spotdl.types.song import Song as SpotdlSong
from typing import Any, Dict, List, Literal, Sequence, Set

from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.dialects.postgresql import insert

from backend.db.ormModels.copyright import CopyrightRow
from backend.spotifyApiTypes.RawSpotifyApiSearchResults import RawSpotifyApiSearchResults
from backend.utils.logger import getLogger
from backend.db.db import RockitDB
from backend.constants import IMAGES_PATH
from backend.utils.backendUtils import create_id, download_image, sanitize_folder_name

from backend.db.ormModels.list import ListRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.genre import GenreRow
from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.playlist import PlaylistRow
from backend.db.ormModels.internalImage import InternalImageRow

from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.album_artists import album_artists
from backend.db.associationTables.artist_genres import artist_genres
from backend.db.associationTables.album_copyrights import album_copyrights

from backend.spotifyApiTypes.RawSpotifyApiAlbum import RawSpotifyApiAlbum
from backend.spotifyApiTypes.RawSpotifyApiArtist import RawSpotifyApiArtist
from backend.spotifyApiTypes.RawSpotifyApiTrack import RawSpotifyApiTrack
from backend.spotifyApiTypes.RawSpotifyApiPlaylist import RawSpotifyApiPlaylist


class Spotify:
    """Class to interact with Spotify API"""

    def __init__(self, rockit_db: RockitDB) -> None:

        if not os.path.exists(".spotify_cache"):
            os.mkdir(".spotify_cache")

        self.logger: Logger = getLogger(
            name=__name__, class_name="Spotify")

        self.rockit_db: RockitDB = rockit_db

        self.client_id = os.getenv('CLIENT_ID')
        self.client_secret = os.getenv('CLIENT_SECRET')

        self.token: str | None = None
        self.get_token(from_file=True)

    def get_auth_header(self):
        if not self.token:
            self.logger.critical("token not set")
            return

        return {"Authorization": "Bearer " + self.token}

    def get_token(self, from_file=False):

        if not self.client_id:
            self.logger.critical("client_id not set")
            return

        if not self.client_secret:
            self.logger.critical("client_secret not set")
            return

        if from_file and os.path.exists(".spotify_cache/token"):
            with open(".spotify_cache/token", "r") as f:
                self.token = f.read()
            self.logger.info("New Spotify API token from cache.")

            return

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

        if self.token:
            with open(".spotify_cache/token", "w") as f:
                f.write(self.token)

        self.logger.info("New Spotify API token.")

    def parse_url(self, url: str) -> str:
        return re.sub(r"\/intl-\w+\/", "/", url).split("?")[0]

    def api_call(self, path: str, params: Dict[str, str] = {}) -> Any | None:

        parsed_params = ""

        for index, k in enumerate(list(params.items())):
            if index != 0:
                parsed_params += "&"
            parsed_params += k[0] + "=" + k[1]

        url = f"https://api.spotify.com/v1/{path}"
        headers = self.get_auth_header()

        query_url = url + \
            ("?" + parsed_params if len(parsed_params) > 0 else "")

        self.logger.warning(f"Spotify api call: {query_url}")

        result = requests.get(query_url, headers=headers)
        if result.status_code == 401:
            self.logger.info("Token espired")
            self.get_token()
            headers = self.get_auth_header()
            result = requests.get(query_url, headers=headers)

        try:
            return json.loads(result.content)
        except:
            self.logger.critical(
                f"Unable to load json. {result.content=}, {result.text=} {result.status_code=}")

    def get_spotify_data(self, public_ids: List[str], data_name: Literal["album"] | Literal["artist"] | Literal["track"] | Literal["playlist"]) -> List[Dict]:
        """
        Searches for albums, artists or tracks in cache or via Spotify API.
        """
        with open(f".spotify_cache/{data_name}s.json", "r") as f:
            data = json.load(f)

        missing_data: List[str] = []
        result: List[Dict] = []

        for public_id in public_ids:
            for album in data:
                if album["id"] == public_id:
                    result.append(album)
                    break
            else:
                missing_data.append(public_id)

        self.logger.info(f"{len(result)} {data_name}s found in cache.")
        self.logger.info(f"Missing {data_name}s: {len(missing_data)}")

        max_data_per_call: int | None = None
        if data_name == "track":
            max_data_per_call = 100
        elif data_name == "artist":
            max_data_per_call = 50
        elif data_name == "album":
            max_data_per_call = 20
        else:
            self.logger.error(f"Unkown data type '{data_name}'.")
            return []

        for i in range(math.ceil(len(missing_data)/max_data_per_call)):
            response = self.api_call(
                path=f"{data_name}s", params={"ids": ",".join(missing_data[i*max_data_per_call:(i + 1)*max_data_per_call])})

            if not response:
                self.logger.error("Response is None")
                continue

            result.extend(response[f"{data_name}s"])
            data.extend(response[f"{data_name}s"])

            self.logger.info(f"{data_name}s cache length: {len(data)}.")

            with open(f".spotify_cache/{data_name}s.json", "w") as f:
                json.dump(data, f)

        return result

    def search(self, q: str, limit: int = 6) -> RawSpotifyApiSearchResults:
        """Searches Spotify for tracks, albums, playlists and artists."""

        response = self.api_call(
            path="search", params={"q": q, "type": "track,album,playlist,artist", "limit": str(limit)})

        parsed_response: RawSpotifyApiSearchResults = RawSpotifyApiSearchResults.from_dict(
            response)

        return parsed_response

    def download_image(self, image_url: str, image_path_dir: str):
        """TODO"""

        image_path = os.path.join(image_path_dir, "image.png")

        if not os.path.exists(os.path.join(IMAGES_PATH, image_path_dir)):
            os.makedirs(os.path.join(
                IMAGES_PATH, image_path_dir))

        if not os.path.exists(os.path.join(IMAGES_PATH, image_path)) and type(image_url) == str:
            self.logger.info(
                f"Downloading image {image_url=} {image_path=}")
            download_image(url=image_url, path=os.path.join(
                IMAGES_PATH, image_path))

        image_public_id = create_id()

        def _func(s: Session):
            image_to_add = InternalImageRow(
                public_id=image_public_id,
                url=f"https://api.rockit.rockhosting.org/image/{image_public_id}",
                path=image_path
            )

            image_to_add = s.merge(image_to_add)
            s.flush()
            return image_to_add.id

        return self.rockit_db.execute_with_session(_func)

    def get_spotdl_song_from_song_row(self, song_row: SongRow) -> SpotdlSong:
        """TODO"""

        if len(song_row.artists) == 0:
            self.logger.error(
                f"Song {song_row.public_id} has no artists in database.")

            song_row = self.get_song(song_row.public_id)

        return SpotdlSong(
            name=song_row.name,
            artists=[artist.name for artist in song_row.artists],
            artist=song_row.artists[0].name,
            genres=[],
            disc_number=1,
            disc_count=1,
            album_name=song_row.album.name,
            album_artist=song_row.album.artists[0].name,
            album_type="album",
            album_id=song_row.album.public_id,
            duration=song_row.duration,
            year=1,
            date="date",
            track_number=1,
            tracks_count=1,
            song_id=song_row.public_id,
            explicit=False,
            publisher="publisher",
            url=f"https://open.spotify.com/track/{song_row.public_id}",
            isrc=song_row.isrc,
            cover_url="cover_url",
            copyright_text="copyright_text",
            download_url=song_row.download_url
        )

    # ***********************
    # **** Album methods ****
    # ***********************
    def get_albums_from_spotify(self, public_ids: List[str]) -> List[RawSpotifyApiAlbum]:
        """Fetches Spotify API for albums given the IDs."""

        result: List[RawSpotifyApiAlbum] = []

        raw_albums = self.get_spotify_data(public_ids, "album")

        for raw_album in raw_albums:
            result.append(RawSpotifyApiAlbum.from_dict(raw_album))

        return result

    def get_albums_from_db(self, public_ids: List[str]) -> Sequence[AlbumRow]:
        return self.rockit_db.execute_with_session(
            lambda s:
            s.execute(
                select(AlbumRow)
                .options(
                    joinedload(AlbumRow.songs).
                    joinedload(SongRow.artists),
                    joinedload(AlbumRow.songs).
                    joinedload(SongRow.album).
                    joinedload(AlbumRow.artists)
                )
                .where(
                    AlbumRow.public_id.in_(public_ids)
                ))
                .unique()
                .scalars()
                .all()
        )

    def add_spotify_albums_to_db(self, albums: List[RawSpotifyApiAlbum]) -> None:
        """Adds Spotify albums to database."""

        with self.rockit_db.session_scope() as s:
            # Get all artists in album and songs.
            artist_ids: Set[str] = set()

            for album in albums:
                if not album.artists or not album.tracks or not album.tracks.items:
                    continue

                for artist in album.artists:
                    if not artist.id:
                        continue
                    artist_ids.add(artist.id)

                for track in album.tracks.items:
                    if not track.artists:
                        continue
                    for artist in track.artists:
                        if not artist.id:
                            continue
                        artist_ids.add(artist.id)

            artists_in_db: List[ArtistRow] = self.get_artists(
                list(artist_ids))

            internal_images_in_db: Sequence[InternalImageRow] = s.execute(select(InternalImageRow).where(
                InternalImageRow.url.in_([album.images[0].url for album in albums if album.images and album.images[0].url]))).scalars().all()

            lists_in_db: Sequence[ListRow] = s.execute(select(ListRow).where(
                ListRow.public_id.in_([album.id for album in albums]))).scalars().all()

            albums_in_db: Sequence[AlbumRow] = s.execute(select(AlbumRow).where(
                AlbumRow.public_id.in_([album.id for album in albums]))).scalars().all()

            for album in albums:

                if not album.id or not album.name or not album.release_date or not album.tracks or not album.tracks or not album.tracks or not album.tracks.items or not album.images or not album.images[0].url or not album.artists or not album.artists[0].name or not album.popularity or not album.copyrights:
                    self.logger.error(f"Album is missing properties. {album=}")
                    continue

                album_id: None | int = None

                for list_in_db in lists_in_db:
                    if list_in_db.public_id == album.id:
                        album_id = list_in_db.id
                        self.logger.info(
                            f"List {list_in_db.id} - {list_in_db.public_id} of type {list_in_db.type} already in DB.")
                        break
                else:
                    # Add list.
                    list_to_add = ListRow(
                        type="album",
                        public_id=album.id
                    )

                    list_to_add = s.merge(list_to_add)
                    s.flush()
                    album_id = list_to_add.id

                # Add album internal image.
                internal_image_id: int | None = None
                for internal_image_in_db in internal_images_in_db:
                    if album.images[0].url == internal_image_in_db.url:
                        internal_image_id = internal_image_in_db.id

                if not internal_image_id:
                    internal_image_id = self.download_image(
                        image_url=album.images[0].url,
                        image_path_dir=os.path.join(
                            "album", sanitize_folder_name(
                                name=album.artists[0].name),
                            sanitize_folder_name(name=album.name)
                        )
                    )

                for album_in_db in albums_in_db:
                    if album_in_db.public_id == album.id:
                        self.logger.info(
                            f"Album {album_in_db.id} - {album_in_db.public_id} already in DB.")
                        break
                else:
                    # Add album.
                    album_to_add = AlbumRow(
                        public_id=album.id,
                        id=album_id,
                        internal_image_id=internal_image_id,
                        name=album.name,
                        release_date=album.release_date,
                        disc_count=max(
                            [song.disc_number for song in album.tracks.items if song.disc_number]),
                        popularity=album.popularity
                    )
                    album_to_add = s.merge(album_to_add)
                    s.commit()

                # Add album copyrights.
                for album_copyright in album.copyrights:
                    copyright_in_db = s.query(CopyrightRow).where(and_(
                        CopyrightRow.text == album_copyright.text,
                        CopyrightRow.type == album_copyright.type
                    )).first()

                    copyright_in_db_id: int | None = None

                    if copyright_in_db:
                        copyright_in_db_id = copyright_in_db.id
                    else:
                        if not album_copyright.text:
                            self.logger.error(
                                f"Copyright text of album {album.id} is None")
                            continue
                        if not album_copyright.type in ("C", "P"):
                            self.logger.error(
                                f"Copyright type of album {album.id} is not 'C' or 'P'")
                            continue

                        copyright_to_add = CopyrightRow(
                            public_id=create_id(),
                            text=album_copyright.text,
                            type=album_copyright.type
                        )
                        copyright_to_add = s.merge(instance=copyright_to_add)
                        s.commit()
                        copyright_in_db_id = copyright_to_add.id

                    stmt = insert(album_copyrights).values(
                        album_id=album_id,
                        copyright_id=copyright_in_db_id
                    ).on_conflict_do_nothing()
                    s.execute(stmt)

                for artist in album.artists:
                    artist_id: int | None = None
                    for artist_in_db in artists_in_db:
                        if artist.id == artist_in_db.public_id:
                            artist_id = artist_in_db.id

                    if not artist_id:
                        self.logger.error("Artist not found in database.")
                        continue

                    stmt = insert(album_artists).values(
                        album_id=album_id,
                        artist_id=artist_id
                    ).on_conflict_do_nothing()
                    s.execute(stmt)

                self.get_songs(
                    [song.id for song in album.tracks.items if song.id])

    def get_albums(self, public_ids: List[str]) -> List[AlbumRow]:
        """TODO"""

        result: List[AlbumRow] = []

        albums_in_db: Sequence[AlbumRow] = self.get_albums_from_db(
            public_ids=public_ids)

        have_to_update = False

        # Check if albums has no artists. That should never happen.
        for album_in_db in albums_in_db:
            if len(album_in_db.artists) == 0:
                self.logger.error(
                    f"Album {album_in_db.id} - {album_in_db.public_id} has no artists in database.")
                spotify_albums = self.get_albums_from_spotify(
                    [album_in_db.public_id,])
                self.add_spotify_albums_to_db(spotify_albums)

                have_to_update = True

        # If an album with no artists was found, the artists should be now in database so update all albums.
        if have_to_update:
            albums_in_db: Sequence[AlbumRow] = self.get_albums_from_db(
                public_ids=public_ids)

        albums_in_db_public_ids: List[str] = [
            album.public_id for album in albums_in_db]

        missing_albums: List[str] = []

        for public_id in public_ids:
            if not public_id in albums_in_db_public_ids:
                missing_albums.append(public_id)

        self.logger.info(
            f"{len(albums_in_db_public_ids)} album(s) in database, {len(missing_albums)} album(s) missing.")

        if len(missing_albums) > 0:
            spotify_albums = self.get_albums_from_spotify(missing_albums)
            self.add_spotify_albums_to_db(spotify_albums)

        new_albums_in_db = self.get_albums_from_db(missing_albums)

        if len(new_albums_in_db) != len(missing_albums):
            self.logger.error(
                f"{len(missing_albums) - len(new_albums_in_db)} missing albums haven't been added to database.")

        for album_in_db in albums_in_db:
            result.append(album_in_db)

        for album_in_db in new_albums_in_db:
            result.append(album_in_db)

        return result

    def get_album(self, public_id: str) -> AlbumRow:
        """Get a single album given the public ID."""

        return self.get_albums([public_id])[0]

    # **********************
    # **** Song methods ****
    # **********************
    def get_songs_from_spotify(self, public_ids: List[str]) -> List[RawSpotifyApiTrack]:
        """Fetches Spotify API for songs given the IDs."""

        result: List[RawSpotifyApiTrack] = []

        raw_songs = self.get_spotify_data(public_ids, "track")

        for raw_song in raw_songs:
            result.append(RawSpotifyApiTrack.from_dict(raw_song))

        return result

    def get_songs_from_db(self, public_ids) -> Sequence[SongRow]:
        return self.rockit_db.execute_with_session(
            lambda s:
            s.execute(
                select(SongRow)
                .options(
                    joinedload(SongRow.artists),
                    joinedload(SongRow.album).
                    joinedload(AlbumRow.artists)
                )
                .where(
                    SongRow.public_id.in_(public_ids)
                ))
                .unique()
                .scalars()
                .all()
        )

    def add_spotify_songs_to_db(self, songs: List[RawSpotifyApiTrack]) -> None:
        """Adds Spotify songs to database."""

        with self.rockit_db.session_scope() as s:

            artist_ids: Set[str] = set()

            for song in songs:
                if not song.artists:
                    continue
                for artist in song.artists:
                    if not artist.id:
                        continue
                    artist_ids.add(artist.id)

            artists_in_db: List[ArtistRow] = self.get_artists(
                list(artist_ids))

            albums_in_db = s.execute(select(AlbumRow).where(AlbumRow.public_id.in_(
                [song.album.id for song in songs if song.album and song.album.id]))).scalars().all()

            songs_in_db = self.get_songs_from_db(
                public_ids=[song.id for song in songs])

            for song in songs:
                if not song.id or not song.name or not song.duration_ms or not song.track_number or not song.disc_number or not song.external_ids or not song.external_ids.isrc or not song.album or not song.album.id or not song.artists:
                    continue

                album_id: int | None = None
                internal_image_id: int | None = None

                for album_in_db in albums_in_db:
                    if album_in_db.public_id == song.album.id:
                        album_id = album_in_db.id
                        internal_image_id = album_in_db.internal_image_id

                if not album_id or not internal_image_id:
                    self.logger.error(
                        f"Unable to add song {song.id} because the album {song.album.id} is not yet in database. Consider calling self.get_albums(list of songs album id) before this.")
                    continue

                song_id: int | None = None

                for song_in_db in songs_in_db:
                    if song_in_db.public_id == song.id:
                        song_id = song_in_db.id
                        self.logger.info(
                            f"Song {song_in_db.id} - {song_in_db.public_id} already in DB.")
                        break
                else:
                    song_to_add = SongRow(
                        public_id=song.id,
                        name=song.name,
                        duration=int(song.duration_ms/1000),
                        track_number=song.track_number,
                        disc_number=song.disc_number,
                        internal_image_id=internal_image_id,
                        album_id=album_id,
                        isrc=song.external_ids.isrc,
                        preview_url=song.preview_url
                    )

                    song_to_add = s.merge(song_to_add)
                    s.flush()

                    song_id = song_to_add.id

                for artist in song.artists:
                    artist_id: int | None = None
                    for artist_in_db in artists_in_db:
                        if artist.id == artist_in_db.public_id:
                            artist_id = artist_in_db.id

                    if not artist_id:
                        self.logger.error("Artist not found in database.")
                        continue

                    stmt = insert(song_artists).values(
                        song_id=song_id,
                        artist_id=artist_id
                    ).on_conflict_do_nothing()
                    s.execute(stmt)

    def get_songs(self, public_ids: List[str]) -> List[SongRow]:
        """TODO"""

        result: List[SongRow] = []

        songs_in_db: Sequence[SongRow] = self.get_songs_from_db(public_ids)

        songs_in_db_public_ids: List[str] = [
            song.public_id for song in songs_in_db]

        missing_songs: List[str] = []

        for public_id in public_ids:
            if not public_id in songs_in_db_public_ids:
                missing_songs.append(public_id)

        # Check if song in db has no artists. This should never happen.
        for song_in_db in songs_in_db:
            if len(song_in_db.artists) == 0:
                self.logger.error(
                    f"Song {song_in_db.id} - {song_in_db.public_id} has no artists in database.")
                missing_songs.append(song_in_db.public_id)

        self.logger.info(
            f"{len(songs_in_db_public_ids)} songs in database, {len(missing_songs)} songs missing.")

        spotify_songs: List[RawSpotifyApiTrack] = self.get_songs_from_spotify(
            missing_songs)
        self.add_spotify_songs_to_db(spotify_songs)

        new_songs_in_db: Sequence[SongRow] = self.get_songs_from_db(
            missing_songs)

        if len(new_songs_in_db) != len(missing_songs):
            self.logger.error(
                f"{len(missing_songs) - len(new_songs_in_db)} missing songs haven't been added to database.")

        for song_in_db in songs_in_db:
            for new_song_in_db in new_songs_in_db:
                if song_in_db.id == new_song_in_db.id:
                    self.logger.warning(
                        f"Song {song_in_db.id} is in both, songs_in_db and new_songs_in_db, skipping song_in_db because new_song_in_db is probably updated")
                    break
            else:
                result.append(song_in_db)

        for new_song_in_db in new_songs_in_db:
            result.append(new_song_in_db)

        return result

    def get_song(self, public_id: str) -> SongRow:
        """Get a single song given the public ID."""

        return self.get_songs([public_id])[0]

    # **************************
    # **** Playlist methods ****
    # **************************
    def get_playlists_from_spotify(self, public_ids: List[str]) -> List[RawSpotifyApiPlaylist]:
        """Fetches Spotify API for playlists given the IDs."""

        result: List[RawSpotifyApiPlaylist] = []

        raw_playlists = self.get_spotify_data(public_ids, "playlist")

        for raw_playlist in raw_playlists:
            result.append(RawSpotifyApiPlaylist.from_dict(raw_playlist))

        return result

    def add_spotify_playlists_to_db(self, playlists: List[RawSpotifyApiPlaylist]) -> None:
        """Adds Spotify playlists to database."""

        self.logger.error("Not implemented error.")

    def get_playlists(self, public_ids: List[str]) -> List[PlaylistRow]:
        """TODO"""

        result: List[PlaylistRow] = []

        self.logger.error("Not implemented error.")

        return result

    def get_playlist(self, public_id: str) -> PlaylistRow:
        """Get a single playlist given the public ID."""

        return self.get_playlists([public_id])[0]

    # ************************
    # **** Artist methods ****
    # ************************
    def get_artists_from_spotify(self, public_ids: List[str]) -> List[RawSpotifyApiArtist]:
        """Fetches Spotify API for artists given the IDs."""

        result: List[RawSpotifyApiArtist] = []

        raw_artists = self.get_spotify_data(public_ids, "artist")

        for raw_artist in raw_artists:
            result.append(RawSpotifyApiArtist.from_dict(raw_artist))

        return result

    def add_spotify_artists_to_db(self, artists: List[RawSpotifyApiArtist]) -> None:
        """Adds Spotify artists to database."""

        def _func(s: Session):

            genres_in_db: List[GenreRow] = s.query(GenreRow).all()

            for artist in artists:
                if \
                        not artist.name or \
                        not artist.id or \
                        not artist.followers or\
                        not artist.followers.total or\
                        not artist.popularity or \
                        not artist.images or\
                        not artist.images[0].url or \
                        artist.genres is None:
                    self.logger.error(
                        f"Artist is missing properties. {artist=}")
                    continue

                internal_image_id: int = self.download_image(
                    image_url=artist.images[0].url,
                    image_path_dir=os.path.join(
                        "artist", sanitize_folder_name(artist.name)
                    )
                )

                artist_to_add = ArtistRow(
                    name=artist.name,
                    public_id=artist.id,
                    followers=artist.followers.total,
                    popularity=artist.popularity,
                    internal_image_id=internal_image_id)

                artist_to_add = s.merge(artist_to_add)
                s.flush()

                for genre in artist.genres:

                    genre_id: int | None = None
                    for genre_in_db in genres_in_db:
                        if genre_in_db.name == genre:
                            genre_id = genre_in_db.id
                            break
                    else:
                        genre_to_add = GenreRow(
                            public_id=create_id(),
                            name=genre
                        )
                        genre_to_add = s.merge(genre_to_add)
                        s.flush()
                        genres_in_db.append(genre_to_add)
                        genre_id = genre_to_add.id

                    stmt = insert(artist_genres).values(
                        artist_id=artist_to_add.id,
                        genre_id=genre_id
                    ).on_conflict_do_nothing()
                    s.execute(stmt)
                    s.flush()

        self.rockit_db.execute_with_session(_func)

    def get_artists(self, public_ids: List[str]) -> List[ArtistRow]:
        """TODO"""

        result: List[ArtistRow] = []

        artists_in_db: Sequence[ArtistRow] = self.rockit_db.execute_with_session(lambda s: s.execute(select(ArtistRow).where(
            ArtistRow.public_id.in_(public_ids))).scalars().all())

        artists_in_db_public_ids: List[str] = [
            artist.public_id for artist in artists_in_db]

        missing_artists: List[str] = []

        for public_id in public_ids:
            if not public_id in artists_in_db_public_ids:
                missing_artists.append(public_id)

        self.logger.info(
            f"{len(artists_in_db_public_ids)} artists in database, {len(missing_artists)} artists missing.")

        spotify_artists = self.get_artists_from_spotify(missing_artists)
        self.add_spotify_artists_to_db(spotify_artists)

        new_artists_in_db: Sequence[ArtistRow] = self.rockit_db.execute_with_session(lambda s: s.execute(select(ArtistRow).where(
            ArtistRow.public_id.in_(missing_artists))).scalars().all())

        if len(new_artists_in_db) != len(missing_artists):
            self.logger.error(
                f"{len(missing_artists) - len(new_artists_in_db)} missing artists haven't been added to database.")

        for artist_in_db in artists_in_db:
            result.append(artist_in_db)

        for artist_in_db in new_artists_in_db:
            result.append(artist_in_db)

        return result

    def get_artist(self, public_id: str) -> ArtistRow:
        """Get a single artist given the public ID."""

        return self.get_artists([public_id])[0]
