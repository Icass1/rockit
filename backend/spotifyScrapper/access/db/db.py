from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase

from backend.spotifyScrapper.access.db.ormModels.externalImage import (
    ExternalImageRow as ExternalImageRow,
)
from backend.spotifyScrapper.access.db.ormModels.playlist import (
    PlaylistRow as PlaylistRow,
)
from backend.spotifyScrapper.access.db.ormModels.copyright import (
    CopyrightRow as CopyrightRow,
)
from backend.spotifyScrapper.access.db.ormModels.artist import (
    ArtistRow as ArtistRow,
)
from backend.spotifyScrapper.access.db.ormModels.album import (
    AlbumRow as AlbumRow,
)
from backend.spotifyScrapper.access.db.ormModels.genre import (
    GenreRow as GenreRow,
)
from backend.spotifyScrapper.access.db.ormModels.track import (
    TrackRow as TrackRow,
)

schemas = ["spotify_scrapper"]
base = SpotifyScrapperBase
