# BASE
from backend.youtube.access.db.base import YoutubeBase

# GENERAL TABLES
from backend.core.access.db.ormModels.image import ImageRow  # type: ignore
from backend.youtube.access.db.ormModels.externalImage import ExternalImageRow  # type: ignore
from backend.youtube.access.db.ormModels.playlist import YoutubePlaylistRow  # type: ignore
from backend.youtube.access.db.ormModels.channel import ChannelRow  # type: ignore
from backend.youtube.access.db.ormModels.video import VideoRow  # type: ignore

schemas = ["youtube"]
base = YoutubeBase
