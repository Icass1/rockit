# BASE
from backend.spotify.access.db.base import SpotifyBase

# CACHE TABLES
from backend.spotify.access.db.ormModels.playlistCache import SpotifyCachePlaylistRow  # type: ignore
from backend.spotify.access.db.ormModels.artistCache import SpotifyCacheArtistRow  # type: ignore
from backend.spotify.access.db.ormModels.albumCache import SpotifyCacheAlbumRow  # type: ignore
from backend.spotify.access.db.ormModels.trackCache import SpotifyCacheTrackRow  # type: ignore

# ENUMS
from backend.spotify.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow  # type: ignore

# GENERAL TABLES
from backend.spotify.access.db.ormModels.downloadStatus import DownloadStatusRow  # type: ignore
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow  # type: ignore
from backend.spotify.access.db.ormModels.internalImage import InternalImageRow  # type: ignore
from backend.spotify.access.db.ormModels.copyright import CopyrightRow  # type: ignore
from backend.spotify.access.db.ormModels.download import DownloadRow  # type: ignore
from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow  # type: ignore
from backend.spotify.access.db.ormModels.artist import ArtistRow  # type: ignore
from backend.spotify.access.db.ormModels.album import AlbumRow  # type: ignore
from backend.spotify.access.db.ormModels.genre import GenreRow  # type: ignore
from backend.spotify.access.db.ormModels.track import TrackRow  # type: ignore


schema = "spotify"
base = SpotifyBase
