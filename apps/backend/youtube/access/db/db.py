from youtube.access import downloadStorage as downloadStorage
from youtube.access.db.base import YoutubeBase
from youtube.access.db.ormModels.channel import ChannelRow as ChannelRow
from youtube.access.db.ormModels.externalImage import (
    ExternalImageRow as ExternalImageRow,
)
from youtube.access.db.ormModels.playlist import (
    YoutubePlaylistRow as YoutubePlaylistRow,
)
from youtube.access.db.ormModels.video import VideoRow as VideoRow

# from core.access.db.ormModels.image import ImageRow

schemas = ["youtube"]
base = YoutubeBase

# Register local storage independently of remote provider activation.
