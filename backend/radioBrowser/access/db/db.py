from backend.radioBrowser.access.db.base import RadioBase

from backend.radioBrowser.access.db.ormModels.station import StationRow as StationRow
from backend.radioBrowser.access.db.ormModels.tag import (
    TagRow as TagRow,
)
from backend.radioBrowser.access.db.ormModels.languageCode import (
    LanguageCodeRow as LanguageCodeRow,
)
from backend.radioBrowser.access.db.ormModels.stationTag import (
    StationTagRow as StationTagRow,
)
from backend.radioBrowser.access.db.ormModels.stationLanguageCode import (
    StationLanguageCodeRow as StationLanguageCodeRow,
)

schemas = ["radio_browser"]
base = RadioBase
