from backend.rockit.access.db.base import RockitBase

from backend.rockit.access.db.ormModels.song import RockitSongRow as RockitSongRow
from backend.rockit.access.db.ormModels.album import RockitAlbumRow as RockitAlbumRow
from backend.rockit.access.db.ormModels.video import RockitVideoRow as RockitVideoRow
from backend.rockit.access.db.ormModels.artist import RockitArtistRow as RockitArtistRow

schemas = ["rockit"]
base = RockitBase
