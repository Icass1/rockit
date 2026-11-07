from spotify.access import collectionCatalog as collectionCatalog
from spotify.access import downloadStorage as downloadStorage
from spotify.access.db.base import SpotifyBase
from spotify.access.db.ormEnums.copyrightTypeEnum import (
    CopyrightTypeEnumRow as CopyrightTypeEnumRow,
)
from spotify.access.db.ormModels.album import AlbumRow as AlbumRow
from spotify.access.db.ormModels.albumCache import (
    CacheAlbumRow as CacheAlbumRow,
)
from spotify.access.db.ormModels.artist import ArtistRow as ArtistRow
from spotify.access.db.ormModels.artistCache import (
    CacheArtistRow as CacheArtistRow,
)
from spotify.access.db.ormModels.copyright import CopyrightRow as CopyrightRow
from spotify.access.db.ormModels.externalImage import (
    ExternalImageRow as ExternalImageRow,
)
from spotify.access.db.ormModels.genre import GenreRow as GenreRow
from spotify.access.db.ormModels.playlist import PlaylistRow as PlaylistRow
from spotify.access.db.ormModels.playlistCache import (
    CachePlaylistRow as CachePlaylistRow,
)
from spotify.access.db.ormModels.track import TrackRow as TrackRow
from spotify.access.db.ormModels.trackCache import (
    CacheTrackRow as CacheTrackRow,
)

schemas = ["spotify", "spotify_cache"]
base = SpotifyBase

# Register local storage independently of remote provider activation.
