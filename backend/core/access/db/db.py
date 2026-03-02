# BASE
from backend.core.access.db.base import CoreBase

# ORMS MODELS
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow  # type: ignore
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow  # type: ignore
from backend.core.access.db.ormModels.user_media import UserMediaRow  # type: ignore
from backend.core.access.db.ormModels.download import DownloadRow  # type: ignore
from backend.core.access.db.ormModels.provider import ProviderRow  # type: ignore
from backend.core.access.db.ormModels.session import SessionRow  # type: ignore
from backend.core.access.db.ormModels.image import ImageRow  # type: ignore
from backend.core.access.db.ormModels.error import ErrorRow  # type: ignore
from backend.core.access.db.ormModels.user import UserRow  # type: ignore

from backend.core.access.db.ormModels.media import CoreMediaRow  # type: ignore

# ENUMS
from backend.core.access.db.ormEnums.downloadStatusEnum import DownloadStatusEnumRow  # type: ignore
from backend.core.access.db.ormEnums.repeatModeEnum import RepeatModeEnumRow  # type: ignore

schemas = ["core"]
base = CoreBase
