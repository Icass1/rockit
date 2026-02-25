# BASE
from backend.spotify.access.db.base import SpotifyBase

# CACHE TABLES
from backend.spotify.access.db.ormModels.playlistCache import CachePlaylistRow  # type: ignore
from backend.spotify.access.db.ormModels.artistCache import CacheArtistRow  # type: ignore
from backend.spotify.access.db.ormModels.albumCache import CacheAlbumRow  # type: ignore
from backend.spotify.access.db.ormModels.trackCache import CacheTrackRow  # type: ignore

# ENUMS
from backend.spotify.access.db.ormEnums.copyrightTypeEnum import CopyrightTypeEnumRow  # type: ignore

# GENERAL TABLES
from backend.core.access.db.ormModels.image import ImageRow  # type: ignore
from backend.spotify.access.db.ormModels.externalImage import ExternalImageRow  # type: ignore
from backend.spotify.access.db.ormModels.playlist import SpotifyPlaylistRow  # type: ignore
from backend.spotify.access.db.ormModels.copyright import CopyrightRow  # type: ignore
from backend.spotify.access.db.ormModels.artist import ArtistRow  # type: ignore
from backend.spotify.access.db.ormModels.album import AlbumRow  # type: ignore
from backend.spotify.access.db.ormModels.genre import GenreRow  # type: ignore
from backend.spotify.access.db.ormModels.track import TrackRow  # type: ignore


schemas = ["spotify", "spotify_cache"]
base = SpotifyBase
