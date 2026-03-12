# BASE
from backend.default.access.db.base import DefaultBase

# GENERAL TABLES
from backend.default.access.db.ormModels.playlist import PlaylistRow  # type: ignore
from backend.default.access.db.ormModels.playlist_media import PlaylistMediaRow  # type: ignore
from backend.default.access.db.ormModels.playlist_contributor import PlaylistContributorRow  # type: ignore
from backend.default.access.db.ormModels.user_disabled_playlist_media import UserDisabledPlaylistMediaRow  # type: ignore

schemas = ["default_schema"]
base = DefaultBase
