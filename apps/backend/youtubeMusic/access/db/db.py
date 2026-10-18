# BASE
from backend.youtubeMusic.access.db.base import YoutubeMusicBase

# GENERAL TABLES
from backend.youtubeMusic.access.db.ormModels.playlist import PlaylistRow as PlaylistRow
from backend.youtubeMusic.access.db.ormModels.artist import ArtistRow as ArtistRow
from backend.youtubeMusic.access.db.ormModels.album import AlbumRow as AlbumRow
from backend.youtubeMusic.access.db.ormModels.track import TrackRow as TrackRow

schemas = ["youtube_music", "youtube_music_cache"]
base = YoutubeMusicBase
