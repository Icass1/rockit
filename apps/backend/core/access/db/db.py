from core.access.db.base import CoreBase
from core.access.db.ormEnums.bookmarkModeEnum import (
    BookmarkModeEnumRow as BookmarkModeEnumRow,
)
from core.access.db.ormEnums.downloadStatusEnum import (
    DownloadStatusEnumRow as DownloadStatusEnumRow,
)
from core.access.db.ormEnums.friendStatusEnum import (
    FriendStatusEnumRow as FriendStatusEnumRow,
)
from core.access.db.ormEnums.listenTogetherStatusEnum import (
    ListenTogetherStatusEnumRow as ListenTogetherStatusEnumRow,
)
from core.access.db.ormEnums.mediaTypeEnum import (
    MediaTypeEnumRow as MediaTypeEnumRow,
)
from core.access.db.ormEnums.platformEnum import (
    PlatformEnumRow as PlatformEnumRow,
)
from core.access.db.ormEnums.playlistContributorRoleEnum import (
    PlaylistContributorRoleEnumRow as PlaylistContributorRoleEnumRow,
)
from core.access.db.ormEnums.queueTypeEnum import (
    QueueTypeEnumRow as QueueTypeEnumRow,
)
from core.access.db.ormEnums.repeatModeEnum import (
    RepeatModeEnumRow as RepeatModeEnumRow,
)
from core.access.db.ormEnums.requestStatusEnum import (
    RequestStatusEnumRow as RequestStatusEnumRow,
)
from core.access.db.ormEnums.requestTypeEnum import (
    RequestTypeEnumRow as RequestTypeEnumRow,
)
from core.access.db.ormEnums.skipDirectionEnum import (
    SkipDirectionEnumRow as SkipDirectionEnumRow,
)
from core.access.db.ormModels.appVersion import AppVersionRow as AppVersionRow
from core.access.db.ormModels.bookmark import BookmarkRow as BookmarkRow
from core.access.db.ormModels.buildUploadSession import (
    BuildUploadSessionRow as BuildUploadSessionRow,
)
from core.access.db.ormModels.download import DownloadRow as DownloadRow
from core.access.db.ormModels.downloadGroup import (
    DownloadGroupRow as DownloadGroupRow,
)
from core.access.db.ormModels.downloadStatus import (
    DownloadStatusRow as DownloadStatusRow,
)
from core.access.db.ormModels.error import ErrorRow as ErrorRow
from core.access.db.ormModels.externalRecommendationCache import (
    ExternalRecommendationCacheRow as ExternalRecommendationCacheRow,
)
from core.access.db.ormModels.friend.friend import FriendRow as FriendRow
from core.access.db.ormModels.friend.friendRequest import (
    FriendRequestRow as FriendRequestRow,
)
from core.access.db.ormModels.friend.levelConfig import (
    LevelConfigRow as LevelConfigRow,
)
from core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow as ListenTogetherSessionRow,
)
from core.access.db.ormModels.friend.sharedMedia import (
    SharedMediaRow as SharedMediaRow,
)
from core.access.db.ormModels.friend.streakBattle import (
    StreakBattleRow as StreakBattleRow,
)
from core.access.db.ormModels.friend.userLevel import (
    UserLevelRow as UserLevelRow,
)
from core.access.db.ormModels.image import ImageRow as ImageRow
from core.access.db.ormModels.language import LanguageRow as LanguageRow
from core.access.db.ormModels.media import CoreMediaRow as CoreMediaRow
from core.access.db.ormModels.notification import (
    NotificationRow as NotificationRow,
)
from core.access.db.ormModels.notificationSubscription import (
    NotificationSubscriptionRow as NotificationSubscriptionRow,
)
from core.access.db.ormModels.pendingUpload import (
    PendingUploadRow as PendingUploadRow,
)
from core.access.db.ormModels.provider import ProviderRow as ProviderRow
from core.access.db.ormModels.requestLog import RequestLogRow as RequestLogRow
from core.access.db.ormModels.session import SessionRow as SessionRow
from core.access.db.ormModels.storageObject import StorageObjectRow as StorageObjectRow
from core.access.db.ormModels.user import UserRow as UserRow
from core.access.db.ormModels.user_library_media import (
    UserLibraryMediaRow as UserLibraryMediaRow,
)
from core.access.db.ormModels.user_liked_media import (
    UserLikedMediaRow as UserLikedMediaRow,
)
from core.access.db.ormModels.user_media_clicked import (
    UserMediaClickedRow as UserMediaClickedRow,
)
from core.access.db.ormModels.user_media_listen_interval import (
    UserMediaListenIntervalRow as UserMediaListenIntervalRow,
)
from core.access.db.ormModels.user_media_listened import (
    UserMediaListenedRow as UserMediaListenedRow,
)
from core.access.db.ormModels.user_queue import UserQueueRow as UserQueueRow
from core.access.db.ormModels.user_seeks import UserSeeksRow as UserSeeksRow
from core.access.db.ormModels.user_skipped_media import (
    UserSkippedMediaRow as UserSkippedMediaRow,
)
from core.access.db.ormModels.vocabulary import VocabularyRow as VocabularyRow

# BASE

# ENUMS

# FRIEND MODELS

# ORMS MODELS

schemas = ["core"]
base = CoreBase
