from sqlalchemy import ForeignKey, Integer, Table, Column

from backend.youtubeMusic.access.db.base import YoutubeMusicBase

track_artists = Table(
    "track_artists",
    YoutubeMusicBase.metadata,
    Column("track_id", Integer, ForeignKey("youtube_music.track.id"), primary_key=True),
    Column(
        "artist_id", Integer, ForeignKey("youtube_music.artist.id"), primary_key=True
    ),
    schema="youtube_music",
)

album_artists = Table(
    "album_artists",
    YoutubeMusicBase.metadata,
    Column("album_id", Integer, ForeignKey("youtube_music.album.id"), primary_key=True),
    Column(
        "artist_id", Integer, ForeignKey("youtube_music.artist.id"), primary_key=True
    ),
    schema="youtube_music",
)
