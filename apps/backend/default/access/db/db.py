from default.access import collectionSource as collectionSource
from default.access import downloadStorage as downloadStorage
from default.access.db.base import DefaultBase
from default.access.db.ormModels.playlist import PlaylistRow as PlaylistRow
from default.access.db.ormModels.playlist_contributor import (
    PlaylistContributorRow as PlaylistContributorRow,
)
from default.access.db.ormModels.playlist_media import (
    PlaylistMediaRow as PlaylistMediaRow,
)
from default.access.db.ormModels.user_disabled_playlist_media import (
    UserDisabledPlaylistMediaRow as UserDisabledPlaylistMediaRow,
)
from default.access.db.ormModels.user_playlist_media_expanded import (
    UserPlaylistMediaExpandedRow as UserPlaylistMediaExpandedRow,
)

schemas = ["default_schema"]
base = DefaultBase

# Register local storage independently of remote provider activation.
