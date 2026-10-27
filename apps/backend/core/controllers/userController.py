from logging import Logger
from typing import cast

from argon2 import PasswordHasher
from fastapi import Depends, APIRouter, File, HTTPException, Request, UploadFile
from logging import Logger
from sqlalchemy.ext.asyncio.session import AsyncSession

from logger import getLogger
from core.utils.backendUtils import time_it

from result import Result

from core.types.libraryMediaTypes import LibraryResponseItem

from core.enums.queueTypeEnum import QueueTypeEnum
from core.enums.repeatModeEnum import RepeatModeEnum

from core.requests.likeMediaRequest import LikeMediaRequest

from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from core.access.db.ormModels.user import UserRow
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from core.access.db.ormModels.user_library_media import UserLibraryMediaRow


from core.framework.user.user import User
from core.framework.user.profileImage import (
    MAX_PROFILE_IMAGE_BYTES,
    upload_profile_image_async,
)
from core.framework.media.image import Image



from core.framework.media.image import Image
from core.framework.notification import Notification
from core.framework.user.user import User
from core.middlewares.authMiddleware import AuthMiddleware
from core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from core.requests.likeMediaRequest import LikeMediaRequest
from core.requests.notificationRequests import UpdateNotificationSubscriptionsRequest
from core.requests.updateCrossfadeRequest import UpdateCrossfadeRequest
from core.requests.updateLangRequest import UpdateLangRequest
from core.requests.updatePasswordRequest import UpdatePasswordRequest
from core.requests.updateCrossfadeRequest import UpdateCrossfadeRequest

from core.responses.okResponse import OkResponse
from core.responses.queueResponse import QueueResponse
from core.responses.sessionResponse import SessionResponse
from core.responses.likedMediaResponse import LikedMediaResponse
from core.responses.userSettingsResponse import UserSettingsResponse
from core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseStationResponse import BaseStationResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.libraryMediasResponse import (
    LibraryMediasResponse,
)
from core.responses.likedMediaResponse import LikedMediaResponse
from core.responses.notificationResponses import (
    NotificationEventResponse,
    NotificationSubscriptionsResponse,
)
from core.responses.okResponse import OkResponse
from core.responses.queueResponse import QueueResponse
from core.responses.sessionResponse import SessionResponse
from core.responses.userSettingsResponse import UserSettingsResponse
from core.types.libraryMediaTypes import LibraryResponseItem
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result

ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
)

logger: Logger = getLogger(name=__name__)
router = APIRouter(
    prefix="/user",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Core", "User"],
)


@router.get("")
async def get_user(request: Request) -> UserSettingsResponse:
    """Get user settings."""

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()
    return UserSettingsResponse(
        username=user.username,
        lang=user.language.lang_code,
        crossfade=user.cross_fade_ms,
        queueType=QueueTypeEnum(user.queue_type_enum),
        repeatMode=RepeatModeEnum(user.repeat_mode_enum),
    )


@router.post("/image", response_model=OkResponse)
async def upload_profile_image(
    request: Request, file: UploadFile = File(...)
) -> OkResponse:
    current_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if current_user.is_not_ok():
        logger.error("Cannot identify profile image owner: %s", current_user.info())
        raise HTTPException(
            status_code=current_user.get_http_code(), detail=current_user.message()
        )
    try:
        data = await file.read(MAX_PROFILE_IMAGE_BYTES + 1)
    finally:
        await file.close()
    result = await upload_profile_image_async(
        DBSessionMiddleware.get_session(request), current_user.result().id, data
    )
    if result.is_not_ok():
        logger.error("Profile image upload failed: %s", result.info())
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return OkResponse()


@router.get("/notification-events")
async def get_notification_events() -> list[NotificationEventResponse]:
    """List the notification types users can subscribe to."""
    return Notification.list_events()


@router.get("/notification-subscriptions")
async def get_notification_subscriptions(request: Request) -> NotificationSubscriptionsResponse:
    """Get notification preferences for the authenticated user."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()
    result = await Notification.get_subscriptions_async(session=session, user_id=user.id)
    if result.is_not_ok():
        logger.error(f"Error getting notification subscriptions. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.patch("/notification-subscriptions")
async def set_notification_subscriptions(
    request: Request, payload: UpdateNotificationSubscriptionsRequest
) -> NotificationSubscriptionsResponse:
    """Update notification preferences for the authenticated user."""
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    result = await Notification.set_subscriptions_async(
        session=session,
        user_id=a_result_user.result().id,
        event_keys=payload.eventKeys,
    )
    if result.is_not_ok():
        logger.error(f"Error updating notification subscriptions. {result.info()}")
        raise HTTPException(status_code=result.get_http_code(), detail=result.message())
    return result.result()


@router.get("/session")
async def get_session(request: Request) -> SessionResponse:
    """TODO"""

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error("Error getting current user.")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    image: ImageRow = a_result_user.result().image

    a_result_image_url: Result[str] = await Image.get_internal_image_url_async(image=image)
    if a_result_image_url.is_not_ok():
        logger.error(f"Error getting image URL. {a_result_image_url.info()}")
        raise HTTPException(
            status_code=a_result_image_url.get_http_code(),
            detail=a_result_image_url.message(),
        )

    return SessionResponse(
        username=a_result_user.result().username,
        image=a_result_image_url.result(),
        admin=a_result_user.result().admin,
        queueType=QueueTypeEnum(value=a_result_user.result().queue_type_key),
        repeatMode=RepeatModeEnum(value=a_result_user.result().repeat_mode_key),
        currentTimeMs=a_result_user.result().current_time_ms,
    )


@router.get(path="/queue")
async def get_queue(request: Request) -> QueueResponse:
    """TODO"""

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_queue: Result[QueueResponse] = await User.get_user_queue_async(
        session=session, user_id=a_result_user.result().id
    )
    if a_result_queue.is_not_ok():
        logger.error(f"Error getting user queue. {a_result_queue.info()}")
        raise HTTPException(
            status_code=a_result_queue.get_http_code(), detail=a_result_queue.message()
        )

    return a_result_queue.result()


@router.get(path="/library/medias")
@time_it
async def get_user_library_medias(
    request: Request,
) -> LibraryMediasResponse:
    """Get all albums in the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result_library_media = await User.get_user_library_medias(
        session, user_id=a_result_user.result().id
    )

    if a_result_library_media.is_not_ok():
        logger.error(f"Error getting user library medias. {a_result_library_media.info()}")
        raise HTTPException(
            status_code=a_result_library_media.get_http_code(),
            detail=a_result_library_media.message(),
        )

    library_media = a_result_library_media.result() or []

    albums = cast(
        list[LibraryResponseItem[BaseAlbumWithoutSongsResponse]],
        [m for m in library_media if m.item.type == "album"],
    )
    playlists = cast(
        list[LibraryResponseItem[BasePlaylistWithoutMediasResponse]],
        [m for m in library_media if m.item.type == "playlist"],
    )
    songs = cast(
        list[LibraryResponseItem[BaseSongWithAlbumResponse]],
        [m for m in library_media if m.item.type == "song"],
    )
    videos = cast(
        list[LibraryResponseItem[BaseVideoResponse]],
        [m for m in library_media if m.item.type == "video"],
    )
    stations = cast(
        list[LibraryResponseItem[BaseStationResponse]],
        [m for m in library_media if m.item.type == "station"],
    )

    return LibraryMediasResponse(
        albums=albums,
        playlists=playlists,
        songs=songs,
        videos=videos,
        stations=stations,
        shared=[],
    )


@router.get(path="/library/media/{media_public_id}")
async def add_media_to_library(request: Request, media_public_id: str) -> OkResponse:
    """Add media to the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: Result[UserLibraryMediaRow] = await User.add_media_to_library(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding media to library. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.delete(path="/library/media/{media_public_id}")
async def remove_media_from_library(request: Request, media_public_id: str) -> OkResponse:
    """Remove media from the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: Result[bool] = await User.remove_media_from_library(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing media from library. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.get("/liked-media")
async def get_liked_media(request: Request) -> LikedMediaResponse:
    """Get all liked media public IDs for the current user."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: Result[list[str]] = await User.get_user_liked_media_public_ids(
        session=session, user_id=a_result_user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting liked media. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return LikedMediaResponse(media=a_result.result())


@router.delete("/like/media/{media_public_id}")
async def unlike_media(request: Request, media_public_id: str) -> OkResponse:
    """Unlike a single media by public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result = await User.unlike_media(
        session=session,
        user_id=a_result_user.result().id,
        media_public_id=media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error unliking media. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.post("/like/media")
async def like_media_async(request: Request, payload: LikeMediaRequest) -> OkResponse:
    """Like multiple media by public_ids."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: Result[list[UserLikedMediaRow]] = await User.like_media_async(
        session=session,
        user_id=a_result_user.result().id,
        public_ids=payload.publicIds,
    )
    if a_result.is_not_ok():
        logger.error(f"Error liking media. {a_result.info()}")
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.post("/lang")
async def update_lang(request: Request, payload: UpdateLangRequest) -> OkResponse:
    """Update user language."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: Result[bool] = await User.update_lang_async(
        session=session,
        user_id=a_result_user.result().id,
        lang_code=payload.lang,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.post("/crossfade")
async def update_crossfade(request: Request, payload: UpdateCrossfadeRequest) -> OkResponse:
    """Update user crossfade."""
    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    crossfade = payload.crossfade
    if crossfade < 0:
        raise HTTPException(status_code=400, detail="Invalid crossfade value")

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result: Result[bool] = await User.update_crossfade_async(
        session=session,
        user_id=a_result_user.result().id,
        crossfade_ms=crossfade,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.post("/password")
async def update_password(request: Request, payload: UpdatePasswordRequest) -> OkResponse:
    """Update user password."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    new_password = payload.password
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    password_hash = ph.hash(new_password)

    a_result: Result[bool] = await User.update_password_async(
        session=session,
        user_id=a_result_user.result().id,
        password_hash=password_hash,
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()


@router.patch("/repeat-mode")
async def cycle_repeat_mode(request: Request) -> OkResponse:
    """Cycle repeat mode."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: Result[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: Result[bool] = await User.cycle_repeat_mode_async(
        session=session, user_id=a_result_user.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(status_code=a_result.get_http_code(), detail=a_result.message())

    return OkResponse()
