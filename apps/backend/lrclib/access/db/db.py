# BASE
from backend.lrclib.access.db.base import LrclibBase

# ORM MODELS
from backend.lrclib.access.db.ormModels.lyricsRow import LyricsRow as LyricsRow
from backend.lrclib.access.db.ormModels.lyricsLineRow import (
    LyricsLineRow as LyricsLineRow,
)
from backend.lrclib.access.db.ormModels.dynamicLyricsLineRow import (
    DynamicLyricsLineRow as DynamicLyricsLineRow,
)

schemas = ["lrclib"]
base = LrclibBase
