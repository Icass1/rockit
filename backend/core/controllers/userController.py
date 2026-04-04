from typing import List

from argon2 import PasswordHasher
from fastapi import Depends, APIRouter, HTTPException, Request
from logging import Logger
from sqlalchemy.ext.asyncio.session import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult

from backend.core.requests.likeMediaRequest import LikeMediaRequest

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from backend.core.access.db.ormModels.image import ImageRow

from backend.core.enums.queueTypeEnum import QueueTypeEnum

from backend.core.framework.user.user import User
from backend.core.framework.media.image import Image

from backend.core.responses.okResponse import OkResponse
from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.sessionResponse import SessionResponse
from backend.core.responses.libraryListsResponse import LibraryListsResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.userSettingsResponse import UserSettingsResponse
from backend.core.requests.updateLangRequest import UpdateLangRequest
from backend.core.requests.updateCrossfadeRequest import UpdateCrossfadeRequest
from backend.core.requests.updatePasswordRequest import UpdatePasswordRequest

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


@router.get("/session")
async def get_session(request: Request) -> SessionResponse:
    """TODO"""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error("Error getting current user.")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    image: ImageRow = a_result_user.result().image

    return SessionResponse(
        username=a_result_user.result().username,
        image=Image.get_internal_image_url(image),
        admin=a_result_user.result().admin,
        queueType=QueueTypeEnum(value=a_result_user.result().queue_type_key),
        currentTimeMs=a_result_user.result().current_time_ms,
    )


@router.get(path="/queue")
async def get_queue(request: Request) -> QueueResponse:
    """TODO"""

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_queue: AResult[QueueResponse] = await User.get_user_queue_async(
        session=session, user_id=a_result_user.result().id
    )
    if a_result_queue.is_not_ok():
        logger.error(f"Error getting user queue. {a_result_queue.info()}")
        raise HTTPException(
            status_code=a_result_queue.get_http_code(), detail=a_result_queue.message()
        )

    return a_result_queue.result()


@router.get(path="/library/lists")
async def get_library_lists(request: Request) -> LibraryListsResponse:
    """Get all albums and playlists in the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request=request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request=request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result_albums: AResult[
        List[
            BaseAlbumWithoutSongsResponse
            | BasePlaylistResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
        ]
    ] = await User.get_user_library_medias(
        session=session, user_id=a_result_user.result().id
    )

    if a_result_albums.is_not_ok():
        logger.error(f"Error getting user albums. {a_result_albums.info()}")
        raise HTTPException(
            status_code=a_result_albums.get_http_code(),
            detail=a_result_albums.message(),
        )

    library_media = a_result_albums.result()

    albums: List[BaseAlbumWithoutSongsResponse] = (
        [m for m in library_media if isinstance(m, BaseAlbumWithoutSongsResponse)]
        if library_media
        else []
    )
    playlists: List[BasePlaylistResponse] = (
        [m for m in library_media if isinstance(m, BasePlaylistResponse)]
        if library_media
        else []
    )
    songs: List[BaseSongWithAlbumResponse] = (
        [m for m in library_media if isinstance(m, BaseSongWithAlbumResponse)]
        if library_media
        else []
    )
    videos: List[BaseVideoResponse] = (
        [m for m in library_media if isinstance(m, BaseVideoResponse)]
        if library_media
        else []
    )

    return LibraryListsResponse(
        albums=albums,
        playlists=playlists,
        songs=songs,
        videos=videos,
        stations=[],
        shared=[],
    )


@router.get(path="/library/albums")
async def get_user_library_medias(
    request: Request,
) -> List[
    BaseAlbumWithoutSongsResponse
    | BasePlaylistResponse
    | BaseSongWithAlbumResponse
    | BaseVideoResponse
]:
    """Get all albums in the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result_albums: AResult[
        List[
            BaseAlbumWithoutSongsResponse
            | BasePlaylistResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
        ]
    ] = await User.get_user_library_medias(session, user_id=a_result_user.result().id)

    if a_result_albums.is_not_ok():
        logger.error(f"Error getting user albums. {a_result_albums.info()}")
        raise HTTPException(
            status_code=a_result_albums.get_http_code(),
            detail=a_result_albums.message(),
        )

    return a_result_albums.result()


@router.post(path="/library/album/{album_public_id}")
async def add_media_to_library(request: Request, album_public_id: str) -> OkResponse:
    """Add an album to the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[UserLibraryMediaRow] = await User.add_media_to_library(
        session=session,
        user_id=a_result_user.result().id,
        album_public_id=album_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding album to library. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.delete(path="/library/album/{album_public_id}")
async def remove_album_from_library(
    request: Request, album_public_id: str
) -> OkResponse:
    """Remove an album from the user's library."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[bool] = await User.remove_album_from_library(
        session=session,
        user_id=a_result_user.result().id,
        album_public_id=album_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing album from library. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.get("/like")
async def get_liked_songs(request: Request) -> List[str]:
    """Get all liked song public IDs for the current user."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[List[str]] = await User.get_user_liked_song_public_ids(
        session=session, user_id=a_result_user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting liked songs. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return a_result.result()


@router.delete("/like/song/{song_public_id}")
async def unlike_song(request: Request, song_public_id: str) -> OkResponse:
    """Unlike a single song by public_id."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result = await User.unlike_song(
        session=session,
        user_id=a_result_user.result().id,
        song_public_id=song_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error unliking song. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post("/like/media")
async def like_media_async(
    request: Request, like_request: LikeMediaRequest
) -> OkResponse:
    """Like multiple media by public_ids."""

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        logger.error(f"Error getting current user. {a_result_user.info()}")
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[List[UserLikedMediaRow]] = await User.like_media_async(
        session=session,
        user_id=a_result_user.result().id,
        public_ids=like_request.publicIds,
    )
    if a_result.is_not_ok():
        logger.error(f"Error liking media. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.get("")
async def get_user(request: Request) -> UserSettingsResponse:
    """Get user settings."""
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    user: UserRow = a_result_user.result()
    return UserSettingsResponse(
        username=user.username,
        lang=user.language.lang_code,
        crossfade=user.cross_fade_ms,
        randomQueue=user.queue_type_key == 1,
        repeatMode=user.repeat_mode_enum.value,
    )


@router.patch("/lang")
async def update_lang(request: Request, payload: UpdateLangRequest) -> OkResponse:
    """Update user language."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[bool] = await User.update_lang_async(
        session=session,
        user_id=a_result_user.result().id,
        lang_code=payload.lang,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.patch("/crossfade")
async def update_crossfade(
    request: Request, payload: UpdateCrossfadeRequest
) -> OkResponse:
    """Update user crossfade."""
    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    crossfade = payload.crossfade
    if crossfade < 0:
        raise HTTPException(status_code=400, detail="Invalid crossfade value")

    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result: AResult[bool] = await User.update_crossfade_async(
        session=session,
        user_id=a_result_user.result().id,
        crossfade_ms=crossfade,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.patch("/password")
async def update_password(
    request: Request, payload: UpdatePasswordRequest
) -> OkResponse:
    """Update user password."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    new_password = payload.password
    if len(new_password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters"
        )

    password_hash = ph.hash(new_password)

    a_result: AResult[bool] = await User.update_password_async(
        session=session,
        user_id=a_result_user.result().id,
        password_hash=password_hash,
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.patch("/random-queue")
async def toggle_random_queue(request: Request) -> OkResponse:
    """Toggle random queue."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[bool] = await User.toggle_random_queue_async(
        session=session, user_id=a_result_user.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.patch("/repeat-mode")
async def cycle_repeat_mode(request: Request) -> OkResponse:
    """Cycle repeat mode."""
    session: AsyncSession = DBSessionMiddleware.get_session(request)

    a_result_user: AResult[UserRow] = AuthMiddleware.get_current_user(request)
    if a_result_user.is_not_ok():
        raise HTTPException(
            status_code=a_result_user.get_http_code(), detail=a_result_user.message()
        )

    a_result: AResult[bool] = await User.cycle_repeat_mode_async(
        session=session, user_id=a_result_user.result().id
    )
    if a_result.is_not_ok():
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
