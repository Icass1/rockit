# **********************************************
# **** File managed by sqlWrapper by RockIt ****
# ***********^**********************************

from sqlalchemy import Table, create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, select
from sqlalchemy.orm import declarative_base, relationship, Session, joinedload, mapped_column
Base = declarative_base()
album_external_images = Table(
    'album_external_images', Base.metadata,
    Column('album_id', ForeignKey('albums.id'),
           primary_key=True, unique=False, nullable=False),
    Column('image_id', ForeignKey('external_images.id'),
           primary_key=True, unique=False, nullable=False),
)

album_artists = Table(
    'album_artists', Base.metadata,
    Column('album_id', ForeignKey('albums.id'),
           primary_key=True, unique=False, nullable=False),
    Column('artist_id', ForeignKey('artists.id'),
           primary_key=True, unique=False, nullable=False),
)

artist_external_images = Table(
    'artist_external_images', Base.metadata,
    Column('artist_id', ForeignKey('artists.id'),
           primary_key=True, unique=False, nullable=False),
    Column('image_id', ForeignKey('external_images.id'),
           primary_key=True, unique=False, nullable=False),
)

song_artists = Table(
    'song_artists', Base.metadata,
    Column('song_id', ForeignKey('songs.id'),
           primary_key=True, unique=False, nullable=False),
    Column('artist_id', ForeignKey('artists.id'),
           primary_key=True, unique=False, nullable=False),
)

playlist_external_images = Table(
    'playlist_external_images', Base.metadata,
    Column('playlist_id', ForeignKey('playlists.id'),
           primary_key=True, unique=False, nullable=False),
    Column('image_id', ForeignKey('external_images.id'),
           primary_key=True, unique=False, nullable=False),
)


class ExternalImage(Base):
    __tablename__ = "external_images"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    url = mapped_column(String, primary_key=False, unique=True, nullable=False)
    width = mapped_column(Integer, primary_key=False,
                          unique=False, nullable=False)
    height = mapped_column(Integer, primary_key=False,
                           unique=False, nullable=False)

    # 2 external_images.id album_external_images.image_id album_external_images.album_id albums.id
    albums = relationship(
        "Album", secondary=album_external_images, back_populates="external_images")
    # 2 external_images.id artist_external_images.image_id artist_external_images.artist_id artists.id
    artists = relationship(
        "Artist", secondary=artist_external_images, back_populates="external_images")
    # 2 external_images.id playlist_external_images.image_id playlist_external_images.playlist_id playlists.id
    playlists = relationship(
        "Playlist", secondary=playlist_external_images, back_populates="external_images")


class InternalImage(Base):
    __tablename__ = "internal_images"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    url = mapped_column(String, primary_key=False, unique=True, nullable=False)
    path = mapped_column(String, primary_key=False,
                         unique=True, nullable=False)

    # 3 internal_images.id albums.image_id
    albums = relationship("Album", back_populates="internal_image")
    # 3 internal_images.id artists.image_id
    artists = relationship("Artist", back_populates="internal_image")
    # 3 internal_images.id songs.image_id
    songs = relationship("Song", back_populates="internal_image")
    # 3 internal_images.id playlists.image_id
    playlists = relationship("Playlist", back_populates="internal_image")


class Album(Base):
    __tablename__ = "albums"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    image_id = mapped_column(String, ForeignKey(
        'internal_images.id'), primary_key=False, unique=False, nullable=False)
    name = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)
    release_date = mapped_column(
        String, primary_key=False, unique=False, nullable=False)
    popularity = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    disc_count = mapped_column(
        Integer, primary_key=False, unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)
    path = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)

    # 1 albums.image_id internal_images.id
    internal_image = relationship("InternalImage", back_populates="albums")

    # 2 albums.id album_external_images.album_id album_external_images.image_id external_images.id
    external_images = relationship(
        "ExternalImage", secondary=album_external_images, back_populates="albums")
    # 2 albums.id album_artists.album_id album_artists.artist_id artists.id
    artists = relationship(
        "Artist", secondary=album_artists, back_populates="albums")
    # 3 albums.id songs.album_id
    songs = relationship("Song", back_populates="album")


class Artist(Base):
    __tablename__ = "artists"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    name = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)
    genres = mapped_column(String, primary_key=False,
                           unique=False, nullable=True)
    followers = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    popularity = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)
    image_id = mapped_column(String, ForeignKey(
        'internal_images.id'), primary_key=False, unique=False, nullable=True)

    # 1 artists.image_id internal_images.id
    internal_image = relationship("InternalImage", back_populates="artists")

    # 2 artists.id album_artists.artist_id album_artists.album_id albums.id
    albums = relationship("Album", secondary=album_artists,
                          back_populates="artists")
    # 2 artists.id artist_external_images.artist_id artist_external_images.image_id external_images.id
    external_images = relationship(
        "ExternalImage", secondary=artist_external_images, back_populates="artists")
    # 2 artists.id song_artists.artist_id song_artists.song_id songs.id
    songs = relationship("Song", secondary=song_artists,
                         back_populates="artists")


class Song(Base):
    __tablename__ = "songs"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    name = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)
    duration = mapped_column(Integer, primary_key=False,
                             unique=False, nullable=False)
    track_number = mapped_column(
        Integer, primary_key=False, unique=False, nullable=False)
    disc_number = mapped_column(
        Integer, primary_key=False, unique=False, nullable=False)
    popularity = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    image_id = mapped_column(String, ForeignKey(
        'internal_images.id'), primary_key=False, unique=False, nullable=True)
    path = mapped_column(String, primary_key=False,
                         unique=False, nullable=True)
    album_id = mapped_column(String, ForeignKey(
        'albums.id'), primary_key=False, unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)
    isrc = mapped_column(String, primary_key=False,
                         unique=True, nullable=False)
    download_url = mapped_column(
        String, primary_key=False, unique=False, nullable=True)
    lyrics = mapped_column(String, primary_key=False,
                           unique=False, nullable=True)
    dynamic_lyrics = mapped_column(
        String, primary_key=False, unique=False, nullable=True)

    # 1 songs.image_id internal_images.id
    internal_image = relationship("InternalImage", back_populates="songs")
    # 1 songs.album_id albums.id
    album = relationship("Album", back_populates="songs")

    # 2 songs.id song_artists.song_id song_artists.artist_id artists.id
    artists = relationship(
        "Artist", secondary=song_artists, back_populates="songs")
    # 3 songs.id users.current_song_id
    users = relationship("User", back_populates="song")
    # 3 songs.id user_queue_songs.song_id
    user_queue_songs = relationship("UserQueueSong", back_populates="song")
    # 3 songs.id user_liked_songs.song_id
    user_liked_songs = relationship("UserLikedSong", back_populates="song")
    # 3 songs.id user_history_songs.song_id
    user_history_songs = relationship("UserHistorySong", back_populates="song")
    # 3 songs.id playlist_songs.song_id
    playlist_songs = relationship("PlaylistSong", back_populates="song")


class User(Base):
    __tablename__ = "users"
    id = mapped_column(String, primary_key=True, unique=False, nullable=False)
    username = mapped_column(String, primary_key=False,
                             unique=True, nullable=False)
    password_hash = mapped_column(
        String, primary_key=False, unique=False, nullable=False)
    current_song_id = mapped_column(String, ForeignKey(
        'songs.id'), primary_key=False, unique=False, nullable=True)
    current_station = mapped_column(
        String, primary_key=False, unique=False, nullable=True)
    current_time = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    queue_index = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    random_queue = mapped_column(
        Boolean, primary_key=False, unique=False, nullable=False)
    repeat_song = mapped_column(
        String, primary_key=False, unique=False, nullable=False)
    volume = mapped_column(Integer, primary_key=False,
                           unique=False, nullable=False)
    cross_fade = mapped_column(
        Integer, primary_key=False, unique=False, nullable=False)
    lang = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)
    admin = mapped_column(Boolean, primary_key=False,
                          unique=False, nullable=False)
    super_admin = mapped_column(
        Boolean, primary_key=False, unique=False, nullable=False)
    dev_user = mapped_column(Boolean, primary_key=False,
                             unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)

    # 1 users.current_song_id songs.id
    song = relationship("Song", back_populates="users")

    # 3 users.id user_lists.user_id
    user_lists = relationship("UserList", back_populates="user")
    # 3 users.id user_queue_songs.user_id
    user_queue_songs = relationship("UserQueueSong", back_populates="user")
    # 3 users.id user_liked_songs.user_id
    user_liked_songs = relationship("UserLikedSong", back_populates="user")
    # 3 users.id user_history_songs.user_id
    user_history_songs = relationship("UserHistorySong", back_populates="user")
    # 3 users.id playlist_songs.added_by
    playlist_songs = relationship("PlaylistSong", back_populates="user")
    # 3 users.id downloads.user_id
    downloads = relationship("Download", back_populates="user")
    # 3 users.id errors.user_id
    errors = relationship("Error", back_populates="user")


class UserList(Base):
    __tablename__ = "user_lists"
    user_id = mapped_column(String, ForeignKey(
        'users.id'), primary_key=True, unique=False, nullable=False)
    item_type = mapped_column(String, primary_key=True,
                              unique=False, nullable=False)
    item_id = mapped_column(String, primary_key=True,
                            unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)

    # 1 user_lists.user_id users.id
    user = relationship("User", back_populates="user_lists")


class UserQueueSong(Base):
    __tablename__ = "user_queue_songs"
    user_id = mapped_column(String, ForeignKey(
        'users.id'), primary_key=True, unique=False, nullable=False)
    position = mapped_column(Integer, primary_key=True,
                             unique=False, nullable=False)
    song_id = mapped_column(String, ForeignKey(
        'songs.id'), primary_key=True, unique=False, nullable=False)
    list_type = mapped_column(
        String, primary_key=False, unique=False, nullable=False)
    list_id = mapped_column(String, primary_key=False,
                            unique=False, nullable=False)

    # 1 user_queue_songs.user_id users.id
    user = relationship("User", back_populates="user_queue_songs")
    # 1 user_queue_songs.song_id songs.id
    song = relationship("Song", back_populates="user_queue_songs")


class UserPinnedList(Base):
    __tablename__ = "user_pinned_lists"
    user_id = mapped_column(String, primary_key=True,
                            unique=False, nullable=False)
    item_type = mapped_column(String, primary_key=True,
                              unique=False, nullable=False)
    item_id = mapped_column(String, primary_key=True,
                            unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)


class UserLikedSong(Base):
    __tablename__ = "user_liked_songs"
    user_id = mapped_column(String, ForeignKey(
        'users.id'), primary_key=True, unique=False, nullable=False)
    song_id = mapped_column(String, ForeignKey(
        'songs.id'), primary_key=True, unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)

    # 1 user_liked_songs.user_id users.id
    user = relationship("User", back_populates="user_liked_songs")
    # 1 user_liked_songs.song_id songs.id
    song = relationship("Song", back_populates="user_liked_songs")


class UserHistorySong(Base):
    __tablename__ = "user_history_songs"
    user_id = mapped_column(String, ForeignKey(
        'users.id'), primary_key=True, unique=False, nullable=False)
    song_id = mapped_column(String, ForeignKey(
        'songs.id'), primary_key=True, unique=False, nullable=False)
    played_at = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)

    # 1 user_history_songs.user_id users.id
    user = relationship("User", back_populates="user_history_songs")
    # 1 user_history_songs.song_id songs.id
    song = relationship("Song", back_populates="user_history_songs")


class Playlist(Base):
    __tablename__ = "playlists"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    image_id = mapped_column(String, ForeignKey(
        'internal_images.id'), primary_key=False, unique=False, nullable=False)
    name = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)
    owner = mapped_column(String, primary_key=False,
                          unique=False, nullable=False)
    followers = mapped_column(
        Integer, primary_key=False, unique=False, nullable=False)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)
    updated_at = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)
    path = mapped_column(String, primary_key=False,
                         unique=False, nullable=False)

    # 1 playlists.image_id internal_images.id
    internal_image = relationship("InternalImage", back_populates="playlists")

    # 2 playlists.id playlist_external_images.playlist_id playlist_external_images.image_id external_images.id
    external_images = relationship(
        "ExternalImage", secondary=playlist_external_images, back_populates="playlists")
    # 3 playlists.id playlist_songs.playlist_id
    playlist_songs = relationship("PlaylistSong", back_populates="playlist")


class PlaylistSong(Base):
    __tablename__ = "playlist_songs"
    playlist_id = mapped_column(String, ForeignKey(
        'playlists.id'), primary_key=True, unique=False, nullable=False)
    song_id = mapped_column(String, ForeignKey(
        'songs.id'), primary_key=True, unique=False, nullable=False)
    added_by = mapped_column(String, ForeignKey(
        'users.id'), primary_key=False, unique=False, nullable=True)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=True)
    disabled = mapped_column(Boolean, primary_key=False,
                             unique=False, nullable=False)

    # 1 playlist_songs.playlist_id playlists.id
    playlist = relationship("Playlist", back_populates="playlist_songs")
    # 1 playlist_songs.song_id songs.id
    song = relationship("Song", back_populates="playlist_songs")
    # 1 playlist_songs.added_by users.id
    user = relationship("User", back_populates="playlist_songs")


class Download(Base):
    __tablename__ = "downloads"
    id = mapped_column(String, primary_key=True, unique=False, nullable=False)
    user_id = mapped_column(String, ForeignKey(
        'users.id'), primary_key=False, unique=False, nullable=False)
    date_started = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)
    date_ended = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=True)
    download_url = mapped_column(
        String, primary_key=False, unique=False, nullable=False)
    status = mapped_column(String, primary_key=False,
                           unique=False, nullable=False)
    seen = mapped_column(Boolean, primary_key=False,
                         unique=False, nullable=False)
    success = mapped_column(Integer, primary_key=False,
                            unique=False, nullable=True)
    fail = mapped_column(Integer, primary_key=False,
                         unique=False, nullable=True)

    # 1 downloads.user_id users.id
    user = relationship("User", back_populates="downloads")


class Error(Base):
    __tablename__ = "errors"
    id = mapped_column(String, primary_key=True, unique=True, nullable=False)
    msg = mapped_column(String, primary_key=False, unique=False, nullable=True)
    source = mapped_column(String, primary_key=False,
                           unique=False, nullable=True)
    line_no = mapped_column(Integer, primary_key=False,
                            unique=False, nullable=True)
    column_no = mapped_column(
        Integer, primary_key=False, unique=False, nullable=True)
    error_message = mapped_column(
        String, primary_key=False, unique=False, nullable=True)
    error_cause = mapped_column(
        String, primary_key=False, unique=False, nullable=True)
    error_name = mapped_column(
        String, primary_key=False, unique=False, nullable=True)
    error_stack = mapped_column(
        String, primary_key=False, unique=False, nullable=True)
    user_id = mapped_column(String, ForeignKey(
        'users.id'), primary_key=False, unique=False, nullable=True)
    date_added = mapped_column(
        DateTime, primary_key=False, unique=False, nullable=False)

    # 1 errors.user_id users.id
    user = relationship("User", back_populates="errors")


engine = create_engine("sqlite:///database.db")
Base.metadata.create_all(engine)

session = Session(engine)
