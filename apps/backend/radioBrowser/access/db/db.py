from radioBrowser.access import collectionCatalog as collectionCatalog
from radioBrowser.access.db.base import RadioBase
from radioBrowser.access.db.ormModels.codec import (
    CodecRow as CodecRow,
)
from radioBrowser.access.db.ormModels.country import (
    CountryRow as CountryRow,
)
from radioBrowser.access.db.ormModels.languageCode import (
    LanguageCodeRow as LanguageCodeRow,
)
from radioBrowser.access.db.ormModels.state import (
    StateRow as StateRow,
)
from radioBrowser.access.db.ormModels.station import StationRow as StationRow
from radioBrowser.access.db.ormModels.stationLanguageCode import (
    StationLanguageCodeRow as StationLanguageCodeRow,
)
from radioBrowser.access.db.ormModels.stationTag import (
    StationTagRow as StationTagRow,
)
from radioBrowser.access.db.ormModels.tag import (
    TagRow as TagRow,
)

schemas = ["radio_browser"]
base = RadioBase
