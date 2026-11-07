from spotifyScrapper.access import collectionCatalog as collectionCatalog
from spotifyScrapper.access import downloadStorage as downloadStorage
from spotifyScrapper.access.db.base import SpotifyScrapperBase
from spotifyScrapper.access.db.ormEnums.copyrightTypeEnum import (
    CopyrightTypeEnumRow as CopyrightTypeEnumRow,
)
from spotifyScrapper.access.db.ormModels.album import (
    AlbumRow as AlbumRow,
)
from spotifyScrapper.access.db.ormModels.artist import (
    ArtistRow as ArtistRow,
)
from spotifyScrapper.access.db.ormModels.copyright import (
    CopyrightRow as CopyrightRow,
)
from spotifyScrapper.access.db.ormModels.externalImage import (
    ExternalImageRow as ExternalImageRow,
)
from spotifyScrapper.access.db.ormModels.genre import (
    GenreRow as GenreRow,
)
from spotifyScrapper.access.db.ormModels.playlist import (
    PlaylistRow as PlaylistRow,
)
from spotifyScrapper.access.db.ormModels.track import (
    TrackRow as TrackRow,
)

schemas = ["spotify_scrapper"]
base = SpotifyScrapperBase

# Register local storage independently of remote provider activation.
