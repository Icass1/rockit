from backend.spotify.access.db.base import SpotifyBase

from backend.spotify.access.db.ormModels.playlistCache import (
    CachePlaylistRow as CachePlaylistRow,
)
from backend.spotify.access.db.ormModels.artistCache import (
    CacheArtistRow as CacheArtistRow,
)
from backend.spotify.access.db.ormModels.albumCache import (
    CacheAlbumRow as CacheAlbumRow,
)
from backend.spotify.access.db.ormModels.trackCache import (
    CacheTrackRow as CacheTrackRow,
)

from backend.spotify.access.db.ormEnums.copyrightTypeEnum import (
    CopyrightTypeEnumRow as CopyrightTypeEnumRow,
)

from backend.spotify.access.db.ormModels.externalImage import (
    ExternalImageRow as ExternalImageRow,
)
from backend.spotify.access.db.ormModels.playlist import PlaylistRow as PlaylistRow
from backend.spotify.access.db.ormModels.copyright import CopyrightRow as CopyrightRow
from backend.spotify.access.db.ormModels.artist import ArtistRow as ArtistRow
from backend.spotify.access.db.ormModels.album import AlbumRow as AlbumRow
from backend.spotify.access.db.ormModels.genre import GenreRow as GenreRow
from backend.spotify.access.db.ormModels.track import TrackRow as TrackRow

schemas = ["spotify", "spotify_cache"]
base = SpotifyBase
