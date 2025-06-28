# **********************************************
# **** File managed by sqlWrapper by RockIt ****
# ***********^**********************************

from backend.db.baseDb import BaseDB, Table
from backend.backendUtils import parse_column
from dataclasses import dataclass
from typing import TypedDict, Optional, cast
from datetime import datetime


class ExternalImagesType(TypedDict):
    id: str
    url: str
    width: float
    height: float
@dataclass
class ExternalImagesRow:
    id: str
    url: str
    width: float
    height: float
def external_images_parser(raw_object: Optional[ExternalImagesType]) -> Optional[ExternalImagesRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "url": cast(str, parse_column(value=raw_object.get("url"), column_type="TEXT")),
        "width": cast(float, parse_column(value=raw_object.get("width"), column_type="INTEGER")),
        "height": cast(float, parse_column(value=raw_object.get("height"), column_type="INTEGER")),
    }
    return ExternalImagesRow(**object)
class AlbumsType(TypedDict):
    id: str
    image: str
    name: str
    release_date: str
    popularity: Optional[float]
    disc_count: float
    date_added: str
@dataclass
class AlbumsRow:
    id: str
    image: str
    name: str
    release_date: str
    popularity: Optional[float]
    disc_count: float
    date_added: datetime
def albums_parser(raw_object: Optional[AlbumsType]) -> Optional[AlbumsRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "image": cast(str, parse_column(value=raw_object.get("image"), column_type="TEXT")),
        "name": cast(str, parse_column(value=raw_object.get("name"), column_type="TEXT")),
        "release_date": cast(str, parse_column(value=raw_object.get("release_date"), column_type="TEXT")),
        "popularity": cast(Optional[float], parse_column(value=raw_object.get("popularity"), column_type="INTEGER")),
        "disc_count": cast(float, parse_column(value=raw_object.get("disc_count"), column_type="INTEGER")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
    }
    return AlbumsRow(**object)
class AlbumExternalImagesType(TypedDict):
    album_id: str
    image_id: str
@dataclass
class AlbumExternalImagesRow:
    album_id: str
    image_id: str
def album_external_images_parser(raw_object: Optional[AlbumExternalImagesType]) -> Optional[AlbumExternalImagesRow]:
    if not raw_object: return
    object = {
        "album_id": cast(str, parse_column(value=raw_object.get("album_id"), column_type="TEXT")),
        "image_id": cast(str, parse_column(value=raw_object.get("image_id"), column_type="TEXT")),
    }
    return AlbumExternalImagesRow(**object)
class ArtistsType(TypedDict):
    id: str
    name: str
    genres: Optional[str]
    followers: Optional[float]
    popularity: Optional[float]
    date_added: str
    image: Optional[str]
@dataclass
class ArtistsRow:
    id: str
    name: str
    genres: Optional[str]
    followers: Optional[float]
    popularity: Optional[float]
    date_added: datetime
    image: Optional[str]
def artists_parser(raw_object: Optional[ArtistsType]) -> Optional[ArtistsRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "name": cast(str, parse_column(value=raw_object.get("name"), column_type="TEXT")),
        "genres": cast(Optional[str], parse_column(value=raw_object.get("genres"), column_type="TEXT")),
        "followers": cast(Optional[float], parse_column(value=raw_object.get("followers"), column_type="INTEGER")),
        "popularity": cast(Optional[float], parse_column(value=raw_object.get("popularity"), column_type="INTEGER")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
        "image": cast(Optional[str], parse_column(value=raw_object.get("image"), column_type="TEXT")),
    }
    return ArtistsRow(**object)
class AlbumArtistsType(TypedDict):
    album_id: str
    artist_id: str
@dataclass
class AlbumArtistsRow:
    album_id: str
    artist_id: str
def album_artists_parser(raw_object: Optional[AlbumArtistsType]) -> Optional[AlbumArtistsRow]:
    if not raw_object: return
    object = {
        "album_id": cast(str, parse_column(value=raw_object.get("album_id"), column_type="TEXT")),
        "artist_id": cast(str, parse_column(value=raw_object.get("artist_id"), column_type="TEXT")),
    }
    return AlbumArtistsRow(**object)
class ArtistExternalImagesType(TypedDict):
    artist_id: str
    image_id: str
@dataclass
class ArtistExternalImagesRow:
    artist_id: str
    image_id: str
def artist_external_images_parser(raw_object: Optional[ArtistExternalImagesType]) -> Optional[ArtistExternalImagesRow]:
    if not raw_object: return
    object = {
        "artist_id": cast(str, parse_column(value=raw_object.get("artist_id"), column_type="TEXT")),
        "image_id": cast(str, parse_column(value=raw_object.get("image_id"), column_type="TEXT")),
    }
    return ArtistExternalImagesRow(**object)
class SongsType(TypedDict):
    id: str
    name: str
    duration: float
    track_number: float
    disc_number: float
    popularity: Optional[float]
    image: Optional[str]
    path: Optional[str]
    album_id: str
    date_added: str
    isrc: str
    download_url: Optional[str]
    lyrics: Optional[str]
    dynamic_lyrics: Optional[str]
@dataclass
class SongsRow:
    id: str
    name: str
    duration: float
    track_number: float
    disc_number: float
    popularity: Optional[float]
    image: Optional[str]
    path: Optional[str]
    album_id: str
    date_added: datetime
    isrc: str
    download_url: Optional[str]
    lyrics: Optional[str]
    dynamic_lyrics: Optional[str]
def songs_parser(raw_object: Optional[SongsType]) -> Optional[SongsRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "name": cast(str, parse_column(value=raw_object.get("name"), column_type="TEXT")),
        "duration": cast(float, parse_column(value=raw_object.get("duration"), column_type="INTEGER")),
        "track_number": cast(float, parse_column(value=raw_object.get("track_number"), column_type="INTEGER")),
        "disc_number": cast(float, parse_column(value=raw_object.get("disc_number"), column_type="INTEGER")),
        "popularity": cast(Optional[float], parse_column(value=raw_object.get("popularity"), column_type="INTEGER")),
        "image": cast(Optional[str], parse_column(value=raw_object.get("image"), column_type="TEXT")),
        "path": cast(Optional[str], parse_column(value=raw_object.get("path"), column_type="TEXT")),
        "album_id": cast(str, parse_column(value=raw_object.get("album_id"), column_type="TEXT")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
        "isrc": cast(str, parse_column(value=raw_object.get("isrc"), column_type="TEXT")),
        "download_url": cast(Optional[str], parse_column(value=raw_object.get("download_url"), column_type="TEXT")),
        "lyrics": cast(Optional[str], parse_column(value=raw_object.get("lyrics"), column_type="TEXT")),
        "dynamic_lyrics": cast(Optional[str], parse_column(value=raw_object.get("dynamic_lyrics"), column_type="TEXT")),
    }
    return SongsRow(**object)
class SongArtistsType(TypedDict):
    song_id: str
    artist_id: str
@dataclass
class SongArtistsRow:
    song_id: str
    artist_id: str
def song_artists_parser(raw_object: Optional[SongArtistsType]) -> Optional[SongArtistsRow]:
    if not raw_object: return
    object = {
        "song_id": cast(str, parse_column(value=raw_object.get("song_id"), column_type="TEXT")),
        "artist_id": cast(str, parse_column(value=raw_object.get("artist_id"), column_type="TEXT")),
    }
    return SongArtistsRow(**object)
class UsersType(TypedDict):
    id: str
    username: str
    password_hash: str
    current_song_id: Optional[str]
    current_station: Optional[str]
    current_time: Optional[float]
    queue_index: Optional[float]
    random_queue: str
    repeat_song: str
    volume: float
    cross_fade: float
    lang: str
    admin: str
    super_admin: str
    impersonate_id: Optional[str]
    dev_user: str
    date_added: str
@dataclass
class UsersRow:
    id: str
    username: str
    password_hash: str
    current_song_id: Optional[str]
    current_station: Optional[str]
    current_time: Optional[float]
    queue_index: Optional[float]
    random_queue: bool
    repeat_song: str
    volume: float
    cross_fade: float
    lang: str
    admin: bool
    super_admin: bool
    impersonate_id: Optional[str]
    dev_user: bool
    date_added: datetime
def users_parser(raw_object: Optional[UsersType]) -> Optional[UsersRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "username": cast(str, parse_column(value=raw_object.get("username"), column_type="TEXT")),
        "password_hash": cast(str, parse_column(value=raw_object.get("password_hash"), column_type="TEXT")),
        "current_song_id": cast(Optional[str], parse_column(value=raw_object.get("current_song_id"), column_type="TEXT")),
        "current_station": cast(Optional[str], parse_column(value=raw_object.get("current_station"), column_type="TEXT")),
        "current_time": cast(Optional[float], parse_column(value=raw_object.get("current_time"), column_type="INTEGER")),
        "queue_index": cast(Optional[float], parse_column(value=raw_object.get("queue_index"), column_type="INTEGER")),
        "random_queue": cast(bool, parse_column(value=raw_object.get("random_queue"), column_type="BOOLEAN")),
        "repeat_song": cast(str, parse_column(value=raw_object.get("repeat_song"), column_type="TEXT")),
        "volume": cast(float, parse_column(value=raw_object.get("volume"), column_type="INTEGER")),
        "cross_fade": cast(float, parse_column(value=raw_object.get("cross_fade"), column_type="INTEGER")),
        "lang": cast(str, parse_column(value=raw_object.get("lang"), column_type="TEXT")),
        "admin": cast(bool, parse_column(value=raw_object.get("admin"), column_type="BOOLEAN")),
        "super_admin": cast(bool, parse_column(value=raw_object.get("super_admin"), column_type="BOOLEAN")),
        "impersonate_id": cast(Optional[str], parse_column(value=raw_object.get("impersonate_id"), column_type="TEXT")),
        "dev_user": cast(bool, parse_column(value=raw_object.get("dev_user"), column_type="BOOLEAN")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
    }
    return UsersRow(**object)
class UserListsType(TypedDict):
    user_id: str
    item_type: str
    item_id: str
    date_added: str
@dataclass
class UserListsRow:
    user_id: str
    item_type: str
    item_id: str
    date_added: datetime
def user_lists_parser(raw_object: Optional[UserListsType]) -> Optional[UserListsRow]:
    if not raw_object: return
    object = {
        "user_id": cast(str, parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "item_type": cast(str, parse_column(value=raw_object.get("item_type"), column_type="TEXT")),
        "item_id": cast(str, parse_column(value=raw_object.get("item_id"), column_type="TEXT")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
    }
    return UserListsRow(**object)
class UserQueueType(TypedDict):
    user_id: str
    position: float
    song_id: str
    list_type: str
    list_id: str
@dataclass
class UserQueueRow:
    user_id: str
    position: float
    song_id: str
    list_type: str
    list_id: str
def user_queue_parser(raw_object: Optional[UserQueueType]) -> Optional[UserQueueRow]:
    if not raw_object: return
    object = {
        "user_id": cast(str, parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "position": cast(float, parse_column(value=raw_object.get("position"), column_type="INTEGER")),
        "song_id": cast(str, parse_column(value=raw_object.get("song_id"), column_type="TEXT")),
        "list_type": cast(str, parse_column(value=raw_object.get("list_type"), column_type="TEXT")),
        "list_id": cast(str, parse_column(value=raw_object.get("list_id"), column_type="TEXT")),
    }
    return UserQueueRow(**object)
class UserPinnedListsType(TypedDict):
    user_id: str
    item_type: str
    item_id: str
    date_added: str
@dataclass
class UserPinnedListsRow:
    user_id: str
    item_type: str
    item_id: str
    date_added: datetime
def user_pinned_lists_parser(raw_object: Optional[UserPinnedListsType]) -> Optional[UserPinnedListsRow]:
    if not raw_object: return
    object = {
        "user_id": cast(str, parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "item_type": cast(str, parse_column(value=raw_object.get("item_type"), column_type="TEXT")),
        "item_id": cast(str, parse_column(value=raw_object.get("item_id"), column_type="TEXT")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
    }
    return UserPinnedListsRow(**object)
class UserLikedSongsType(TypedDict):
    user_id: str
    song_id: str
    date_added: str
@dataclass
class UserLikedSongsRow:
    user_id: str
    song_id: str
    date_added: datetime
def user_liked_songs_parser(raw_object: Optional[UserLikedSongsType]) -> Optional[UserLikedSongsRow]:
    if not raw_object: return
    object = {
        "user_id": cast(str, parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "song_id": cast(str, parse_column(value=raw_object.get("song_id"), column_type="TEXT")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
    }
    return UserLikedSongsRow(**object)
class UserSongHistoryType(TypedDict):
    user_id: str
    song_id: str
    played_at: str
@dataclass
class UserSongHistoryRow:
    user_id: str
    song_id: str
    played_at: datetime
def user_song_history_parser(raw_object: Optional[UserSongHistoryType]) -> Optional[UserSongHistoryRow]:
    if not raw_object: return
    object = {
        "user_id": cast(str, parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "song_id": cast(str, parse_column(value=raw_object.get("song_id"), column_type="TEXT")),
        "played_at": cast(datetime, parse_column(value=raw_object.get("played_at"), column_type="DATE")),
    }
    return UserSongHistoryRow(**object)
class PlaylistsType(TypedDict):
    id: str
    image: str
    name: str
    owner: str
    followers: float
    date_added: str
    updated_at: str
@dataclass
class PlaylistsRow:
    id: str
    image: str
    name: str
    owner: str
    followers: float
    date_added: datetime
    updated_at: datetime
def playlists_parser(raw_object: Optional[PlaylistsType]) -> Optional[PlaylistsRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "image": cast(str, parse_column(value=raw_object.get("image"), column_type="TEXT")),
        "name": cast(str, parse_column(value=raw_object.get("name"), column_type="TEXT")),
        "owner": cast(str, parse_column(value=raw_object.get("owner"), column_type="TEXT")),
        "followers": cast(float, parse_column(value=raw_object.get("followers"), column_type="INTEGER")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
        "updated_at": cast(datetime, parse_column(value=raw_object.get("updated_at"), column_type="sqlWrapper-date-on-update-func")),
    }
    return PlaylistsRow(**object)
class PlaylistExternalImagesType(TypedDict):
    playlist_id: str
    image_id: str
@dataclass
class PlaylistExternalImagesRow:
    playlist_id: str
    image_id: str
def playlist_external_images_parser(raw_object: Optional[PlaylistExternalImagesType]) -> Optional[PlaylistExternalImagesRow]:
    if not raw_object: return
    object = {
        "playlist_id": cast(str, parse_column(value=raw_object.get("playlist_id"), column_type="TEXT")),
        "image_id": cast(str, parse_column(value=raw_object.get("image_id"), column_type="TEXT")),
    }
    return PlaylistExternalImagesRow(**object)
class PlaylistSongsType(TypedDict):
    playlist_id: str
    song_id: str
    added_by: Optional[str]
    date_added: Optional[str]
    disabled: str
@dataclass
class PlaylistSongsRow:
    playlist_id: str
    song_id: str
    added_by: Optional[str]
    date_added: Optional[datetime]
    disabled: bool
def playlist_songs_parser(raw_object: Optional[PlaylistSongsType]) -> Optional[PlaylistSongsRow]:
    if not raw_object: return
    object = {
        "playlist_id": cast(str, parse_column(value=raw_object.get("playlist_id"), column_type="TEXT")),
        "song_id": cast(str, parse_column(value=raw_object.get("song_id"), column_type="TEXT")),
        "added_by": cast(Optional[str], parse_column(value=raw_object.get("added_by"), column_type="TEXT")),
        "date_added": cast(Optional[datetime], parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
        "disabled": cast(bool, parse_column(value=raw_object.get("disabled"), column_type="BOOLEAN")),
    }
    return PlaylistSongsRow(**object)
class DownloadsType(TypedDict):
    id: str
    user_id: str
    date_started: str
    date_ended: Optional[str]
    download_url: str
    status: str
    seen: str
    success: Optional[float]
    fail: Optional[float]
@dataclass
class DownloadsRow:
    id: str
    user_id: str
    date_started: datetime
    date_ended: Optional[datetime]
    download_url: str
    status: str
    seen: bool
    success: Optional[float]
    fail: Optional[float]
def downloads_parser(raw_object: Optional[DownloadsType]) -> Optional[DownloadsRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "user_id": cast(str, parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "date_started": cast(datetime, parse_column(value=raw_object.get("date_started"), column_type="DATE")),
        "date_ended": cast(Optional[datetime], parse_column(value=raw_object.get("date_ended"), column_type="DATE")),
        "download_url": cast(str, parse_column(value=raw_object.get("download_url"), column_type="TEXT")),
        "status": cast(str, parse_column(value=raw_object.get("status"), column_type="TEXT")),
        "seen": cast(bool, parse_column(value=raw_object.get("seen"), column_type="BOOLEAN")),
        "success": cast(Optional[float], parse_column(value=raw_object.get("success"), column_type="INTEGER")),
        "fail": cast(Optional[float], parse_column(value=raw_object.get("fail"), column_type="INTEGER")),
    }
    return DownloadsRow(**object)
class ErrorsType(TypedDict):
    id: str
    msg: Optional[str]
    source: Optional[str]
    line_no: Optional[float]
    column_no: Optional[float]
    error_message: Optional[str]
    error_cause: Optional[str]
    error_name: Optional[str]
    error_stack: Optional[str]
    user_id: Optional[str]
    date_added: str
@dataclass
class ErrorsRow:
    id: str
    msg: Optional[str]
    source: Optional[str]
    line_no: Optional[float]
    column_no: Optional[float]
    error_message: Optional[str]
    error_cause: Optional[str]
    error_name: Optional[str]
    error_stack: Optional[str]
    user_id: Optional[str]
    date_added: datetime
def errors_parser(raw_object: Optional[ErrorsType]) -> Optional[ErrorsRow]:
    if not raw_object: return
    object = {
        "id": cast(str, parse_column(value=raw_object.get("id"), column_type="TEXT")),
        "msg": cast(Optional[str], parse_column(value=raw_object.get("msg"), column_type="TEXT")),
        "source": cast(Optional[str], parse_column(value=raw_object.get("source"), column_type="TEXT")),
        "line_no": cast(Optional[float], parse_column(value=raw_object.get("line_no"), column_type="INTEGER")),
        "column_no": cast(Optional[float], parse_column(value=raw_object.get("column_no"), column_type="INTEGER")),
        "error_message": cast(Optional[str], parse_column(value=raw_object.get("error_message"), column_type="TEXT")),
        "error_cause": cast(Optional[str], parse_column(value=raw_object.get("error_cause"), column_type="TEXT")),
        "error_name": cast(Optional[str], parse_column(value=raw_object.get("error_name"), column_type="TEXT")),
        "error_stack": cast(Optional[str], parse_column(value=raw_object.get("error_stack"), column_type="TEXT")),
        "user_id": cast(Optional[str], parse_column(value=raw_object.get("user_id"), column_type="TEXT")),
        "date_added": cast(datetime, parse_column(value=raw_object.get("date_added"), column_type="sqlWrapper-now-func")),
    }
    return ErrorsRow(**object)
class DB(BaseDB):
    def __init__(self):
        super().__init__()
        self.tables = [
            Table(db=self, table_name="external_images", parser=external_images_parser),
            Table(db=self, table_name="albums", parser=albums_parser),
            Table(db=self, table_name="album_external_images", parser=album_external_images_parser),
            Table(db=self, table_name="artists", parser=artists_parser),
            Table(db=self, table_name="album_artists", parser=album_artists_parser),
            Table(db=self, table_name="artist_external_images", parser=artist_external_images_parser),
            Table(db=self, table_name="songs", parser=songs_parser),
            Table(db=self, table_name="song_artists", parser=song_artists_parser),
            Table(db=self, table_name="users", parser=users_parser),
            Table(db=self, table_name="user_lists", parser=user_lists_parser),
            Table(db=self, table_name="user_queue", parser=user_queue_parser),
            Table(db=self, table_name="user_pinned_lists", parser=user_pinned_lists_parser),
            Table(db=self, table_name="user_liked_songs", parser=user_liked_songs_parser),
            Table(db=self, table_name="user_song_history", parser=user_song_history_parser),
            Table(db=self, table_name="playlists", parser=playlists_parser),
            Table(db=self, table_name="playlist_external_images", parser=playlist_external_images_parser),
            Table(db=self, table_name="playlist_songs", parser=playlist_songs_parser),
            Table(db=self, table_name="downloads", parser=downloads_parser),
            Table(db=self, table_name="errors", parser=errors_parser),
        ]