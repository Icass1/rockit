# BASE
from backend.core.access.db.base import CoreBase

# ORMS MODELS
from backend.core.access.db.ormModels.user_skipped_media import (
    UserSkippedMediaRow as UserSkippedMediaRow,
)
from backend.core.access.db.ormModels.user_media_clicked import (
    UserMediaClickedRow as UserMediaClickedRow,
)
from backend.core.access.db.ormModels.user_library_media import (
    UserLibraryMediaRow as UserLibraryMediaRow,
)
from backend.core.access.db.ormModels.user_media_listened import (
    UserMediaListenedRow as UserMediaListenedRow,
)
from backend.core.access.db.ormModels.user_liked_media import (
    UserLikedMediaRow as UserLikedMediaRow,
)
from backend.core.access.db.ormModels.downloadStatus import (
    DownloadStatusRow as DownloadStatusRow,
)
from backend.core.access.db.ormModels.downloadGroup import (
    DownloadGroupRow as DownloadGroupRow,
)
from backend.core.access.db.ormModels.vocabulary import VocabularyRow as VocabularyRow
from backend.core.access.db.ormModels.requestLog import RequestLogRow as RequestLogRow
from backend.core.access.db.ormModels.appVersion import AppVersionRow as AppVersionRow
from backend.core.access.db.ormModels.user_seeks import UserSeeksRow as UserSeeksRow
from backend.core.access.db.ormModels.user_queue import UserQueueRow as UserQueueRow
from backend.core.access.db.ormModels.download import DownloadRow as DownloadRow
from backend.core.access.db.ormModels.language import LanguageRow as LanguageRow
from backend.core.access.db.ormModels.provider import ProviderRow as ProviderRow
from backend.core.access.db.ormModels.media import CoreMediaRow as CoreMediaRow
from backend.core.access.db.ormModels.session import SessionRow as SessionRow
from backend.core.access.db.ormModels.image import ImageRow as ImageRow
from backend.core.access.db.ormModels.error import ErrorRow as ErrorRow
from backend.core.access.db.ormModels.pendingUpload import (
    PendingUploadRow as PendingUploadRow,
)
from backend.core.access.db.ormModels.user import UserRow as UserRow
from backend.core.access.db.ormModels.bookmark import BookmarkRow as BookmarkRow

# FRIEND MODELS
from backend.core.access.db.ormModels.friend.friend import FriendRow as FriendRow
from backend.core.access.db.ormModels.friend.friendRequest import (
    FriendRequestRow as FriendRequestRow,
)
from backend.core.access.db.ormModels.friend.sharedMedia import (
    SharedMediaRow as SharedMediaRow,
)
from backend.core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow as ListenTogetherSessionRow,
)
from backend.core.access.db.ormModels.friend.userLevel import (
    UserLevelRow as UserLevelRow,
)
from backend.core.access.db.ormModels.friend.levelConfig import (
    LevelConfigRow as LevelConfigRow,
)
from backend.core.access.db.ormModels.friend.streakBattle import (
    StreakBattleRow as StreakBattleRow,
)

# ENUMS
from backend.core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow as PlaylistContributorRoleEnumRow,
)
from backend.core.access.db.ormEnums.downloadStatusEnum import (
    DownloadStatusEnumRow as DownloadStatusEnumRow,
)
from backend.core.access.db.ormEnums.skipDirectionEnum import (
    SkipDirectionEnumRow as SkipDirectionEnumRow,
)
from backend.core.access.db.ormEnums.repeatModeEnum import (
    RepeatModeEnumRow as RepeatModeEnumRow,
)
from backend.core.access.db.ormEnums.mediaTypeEnum import (
    MediaTypeEnumRow as MediaTypeEnumRow,
)
from backend.core.access.db.ormEnums.queueTypeEnum import (
    QueueTypeEnumRow as QueueTypeEnumRow,
)
from backend.core.access.db.ormEnums.bookmarkModeEnum import (
    BookmarkModeEnumRow as BookmarkModeEnumRow,
)
from backend.core.access.db.ormEnums.friendStatusEnum import (
    FriendStatusEnumRow as FriendStatusEnumRow,
)
from backend.core.access.db.ormEnums.listenTogetherStatusEnum import (
    ListenTogetherStatusEnumRow as ListenTogetherStatusEnumRow,
)

schemas = ["core"]
base = CoreBase
