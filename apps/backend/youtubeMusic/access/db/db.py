from youtubeMusic.access import collectionCatalog as collectionCatalog
from youtubeMusic.access import downloadStorage as downloadStorage
from youtubeMusic.access.db.base import YoutubeMusicBase
from youtubeMusic.access.db.ormModels.album import AlbumRow as AlbumRow
from youtubeMusic.access.db.ormModels.artist import ArtistRow as ArtistRow
from youtubeMusic.access.db.ormModels.playlist import PlaylistRow as PlaylistRow
from youtubeMusic.access.db.ormModels.track import TrackRow as TrackRow

# BASE

# GENERAL TABLES

schemas = ["youtube_music", "youtube_music_cache"]
base = YoutubeMusicBase

# Register local storage independently of remote provider activation.
