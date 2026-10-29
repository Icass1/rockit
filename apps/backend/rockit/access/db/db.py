from rockit.access import collectionCatalog as collectionCatalog
from rockit.access import downloadStorage as downloadStorage
from rockit.access.db.base import RockitBase
from rockit.access.db.ormModels.album import RockitAlbumRow as RockitAlbumRow
from rockit.access.db.ormModels.artist import RockitArtistRow as RockitArtistRow
from rockit.access.db.ormModels.song import RockitSongRow as RockitSongRow
from rockit.access.db.ormModels.video import RockitVideoRow as RockitVideoRow

schemas = ["rockit"]
base = RockitBase

# Register local storage independently of remote provider activation.
