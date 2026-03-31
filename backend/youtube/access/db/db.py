from backend.youtube.access.db.base import YoutubeBase

# from backend.core.access.db.ormModels.image import ImageRow
from backend.youtube.access.db.ormModels.externalImage import (
    ExternalImageRow as ExternalImageRow,
)
from backend.youtube.access.db.ormModels.playlist import (
    YoutubePlaylistRow as YoutubePlaylistRow,
)
from backend.youtube.access.db.ormModels.channel import ChannelRow as ChannelRow
from backend.youtube.access.db.ormModels.video import VideoRow as VideoRow

schemas = ["youtube"]
base = YoutubeBase
