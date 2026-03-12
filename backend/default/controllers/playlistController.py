from logging import Logger
from typing import List, Union
from fastapi import Depends, APIRouter, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.okResponse import OkResponse
from backend.core.responses.basePlaylistResponse import (
    BasePlaylistResponse,
    PlaylistContributorResponse,
    PlaylistResponseItem,
)
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.baseStationResponse import BaseStationResponse
from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from backend.core.framework.media.media import Media
from backend.core.access.userAccess import UserAccess

from backend.default.framework.playlist import Playlist
from backend.default.framework.models.playlist import (
    PlaylistModel,
    PlaylistWithDetailsModel,
    PlaylistMediaAddModel,
    PlaylistContributorAddModel,
)
from backend.default.request.playlistRequest import (
    CreatePlaylistRequest,
    UpdatePlaylistRequest,
    AddMediaToPlaylistRequest,
    AddContributorRequest,
)

MediaItemType = Union[
    PlaylistResponseItem[BaseSongWithAlbumResponse],
    PlaylistResponseItem[BaseVideoResponse],
    PlaylistResponseItem[BaseStationResponse],
    PlaylistResponseItem[BasePlaylistForPlaylistResponse],
    PlaylistResponseItem[BaseAlbumWithoutSongsResponse],
]


async def get_playlist_response(
    session: AsyncSession,
    playlist: PlaylistWithDetailsModel,
    owner_name: str,
) -> BasePlaylistResponse:
    """Build a BasePlaylistResponse from a PlaylistWithDetailsModel."""

    medias: List[MediaItemType] = []
    for media in playlist.medias:
        if media.media_type == "song":
            a_result_song = await Media.get_song_async(
                session=session, public_id=media.media_id
            )
            if a_result_song.is_ok():
                medias.append(
                    PlaylistResponseItem(
                        item=a_result_song.result(),
                        addedAt=playlist.date_added,
                    )
                )
        elif media.media_type == "video":
            a_result_video = await Media.get_video_async(
                session=session, public_id=media.media_id
            )
            if a_result_video.is_ok():
                medias.append(
                    PlaylistResponseItem(
                        item=a_result_video.result(),
                        addedAt=playlist.date_added,
                    )
                )
        elif media.media_type == "album":
            a_result_album = await Media.get_album_async(
                session=session, public_id=media.media_id
            )
            if a_result_album.is_ok():
                medias.append(
                    PlaylistResponseItem(
                        item=a_result_album.result(),
                        addedAt=playlist.date_added,
                    )
                )
        elif media.media_type == "playlist":
            a_result_playlist = await Media.get_playlist_async(
                session=session, user_id=playlist.owner_id, public_id=media.media_id
            )
            if a_result_playlist.is_ok():
                medias.append(
                    PlaylistResponseItem(
                        item=a_result_playlist.result(),
                        addedAt=playlist.date_added,
                    )
                )

    contributor_responses: List[PlaylistContributorResponse] = [
        PlaylistContributorResponse(
            user_id=c.user_id,
            role=PlaylistContributorRoleEnum(c.role_key),
        )
        for c in playlist.contributors
    ]

    return BasePlaylistResponse(
        type="playlist",
        description=playlist.description or "",
        provider="default",
        publicId=playlist.public_id,
        url=f"/playlist/{playlist.public_id}",
        name=playlist.name,
        medias=medias,
        contributors=contributor_responses,
        internalImageUrl=playlist.cover_image or "",
        owner=owner_name,
    )


async def get_playlist_list_response(
    session: AsyncSession,
    playlists: List[PlaylistModel],
) -> List[BasePlaylistResponse]:
    """Build a list of BasePlaylistResponse from PlaylistModels."""
    from backend.core.access.userAccess import UserAccess

    result: List[BasePlaylistResponse] = []
    for p in playlists:
        a_result_owner = await UserAccess.get_user_from_id(
            session=session, user_id=p.owner_id
        )
        owner_name: str = "Unknown"
        if a_result_owner.is_ok():
            owner_name = a_result_owner.result().username

        result.append(
            BasePlaylistResponse(
                type="playlist",
                description=p.description or "",
                provider="default",
                publicId=p.public_id,
                url=f"/playlist/{p.public_id}",
                name=p.name,
                medias=[],
                contributors=[],
                internalImageUrl=p.cover_image or "",
                owner=owner_name,
            )
        )
    return result


logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/playlist",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Default", "Playlist"],
)


@router.post("/create", response_model=BasePlaylistResponse)
async def create_playlist_async(
    request: Request, create_request: CreatePlaylistRequest
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistModel] = await Playlist.create_playlist_async(
        session=session,
        name=create_request.name,
        owner_id=user.result().id,
        description=create_request.description,
        is_public=create_request.is_public,
    )
    if a_result.is_not_ok():
        logger.error(f"Error creating playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    playlist: PlaylistModel = a_result.result()
    return BasePlaylistResponse(
        type="playlist",
        description=playlist.description or "",
        provider="default",
        publicId=playlist.public_id,
        url=f"/playlist/{playlist.public_id}",
        name=playlist.name,
        medias=[],
        contributors=[],
        internalImageUrl=playlist.cover_image or "",
        owner=user.result().username,
    )


@router.get("/", response_model=List[BasePlaylistResponse])
async def get_user_playlists_async(
    request: Request,
) -> List[BasePlaylistResponse]:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[list[PlaylistModel]] = await Playlist.get_user_playlists_async(
        session=session, user_id=user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlists. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    playlists: list[PlaylistModel] = a_result.result()
    return await get_playlist_list_response(session=session, playlists=playlists)


@router.get("/{playlist_id}", response_model=BasePlaylistResponse)
async def get_playlist_async(
    request: Request, playlist_id: int
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistWithDetailsModel] = await Playlist.get_playlist_async(
        session=session, playlist_id=playlist_id, user_id=user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    playlist: PlaylistWithDetailsModel = a_result.result()
    a_result_owner = await UserAccess.get_user_from_id(
        session=session, user_id=playlist.owner_id
    )
    owner_name: str = "Unknown"
    if a_result_owner.is_ok():
        owner_name = a_result_owner.result().username

    return await get_playlist_response(
        session=session, playlist=playlist, owner_name=owner_name
    )


@router.patch("/{playlist_id}", response_model=BasePlaylistResponse)
async def update_playlist_async(
    request: Request, playlist_id: int, update_request: UpdatePlaylistRequest
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistModel] = await Playlist.update_playlist_async(
        session=session,
        playlist_id=playlist_id,
        user_id=user.result().id,
        name=update_request.name,
        description=update_request.description,
        cover_image=update_request.cover_image,
        is_public=update_request.is_public,
    )
    if a_result.is_not_ok():
        logger.error(f"Error updating playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    playlist: PlaylistModel = a_result.result()
    a_result_medias: AResult[PlaylistWithDetailsModel] = (
        await Playlist.get_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user.result().id
        )
    )
    if a_result_medias.is_ok():
        playlist_details: PlaylistWithDetailsModel = a_result_medias.result()
        a_result_owner = await UserAccess.get_user_from_id(
            session=session, user_id=playlist_details.owner_id
        )
        owner_name: str = "Unknown"
        if a_result_owner.is_ok():
            owner_name = a_result_owner.result().username

        return await get_playlist_response(
            session=session, playlist=playlist_details, owner_name=owner_name
        )

    return BasePlaylistResponse(
        type="playlist",
        description=playlist.description or "",
        provider="default",
        publicId=playlist.public_id,
        url=f"/playlist/{playlist.public_id}",
        name=playlist.name,
        medias=[],
        contributors=[],
        internalImageUrl=playlist.cover_image or "",
        owner=user.result().username,
    )


@router.delete("/{playlist_id}", response_model=OkResponse)
async def delete_playlist_async(request: Request, playlist_id: int) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.delete_playlist_async(
        session=session, playlist_id=playlist_id, user_id=user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error deleting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post("/{playlist_id}/media", response_model=BasePlaylistResponse)
async def add_media_to_playlist_async(
    request: Request, playlist_id: int, media_request: AddMediaToPlaylistRequest
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistMediaAddModel] = (
        await Playlist.add_media_to_playlist_async(
            session=session,
            playlist_id=playlist_id,
            user_id=user.result().id,
            media_public_id=media_request.media_public_id,
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding media to playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    a_result_playlist: AResult[PlaylistWithDetailsModel] = (
        await Playlist.get_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user.result().id
        )
    )
    if a_result_playlist.is_not_ok():
        raise HTTPException(
            status_code=a_result_playlist.get_http_code(),
            detail=a_result_playlist.message(),
        )

    playlist: PlaylistWithDetailsModel = a_result_playlist.result()
    a_result_owner = await UserAccess.get_user_from_id(
        session=session, user_id=playlist.owner_id
    )
    owner_name: str = "Unknown"
    if a_result_owner.is_ok():
        owner_name = a_result_owner.result().username

    return await get_playlist_response(
        session=session, playlist=playlist, owner_name=owner_name
    )


@router.delete("/{playlist_id}/media/{playlist_media_id}", response_model=OkResponse)
async def remove_media_from_playlist_async(
    request: Request, playlist_id: int, playlist_media_id: int
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    from backend.default.access.playlistAccess import PlaylistAccess

    a_result: AResult[bool] = await PlaylistAccess.remove_media_from_playlist_async(
        session=session, playlist_media_id=playlist_media_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing media from playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post("/{playlist_id}/contributor", response_model=BasePlaylistResponse)
async def add_contributor_async(
    request: Request, playlist_id: int, contributor_request: AddContributorRequest
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistContributorAddModel] = (
        await Playlist.add_contributor_async(
            session=session,
            playlist_id=playlist_id,
            owner_id=user.result().id,
            new_user_id=contributor_request.user_id,
            role_key=contributor_request.role_key,
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding contributor. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    a_result_playlist: AResult[PlaylistWithDetailsModel] = (
        await Playlist.get_playlist_async(
            session=session, playlist_id=playlist_id, user_id=user.result().id
        )
    )
    if a_result_playlist.is_not_ok():
        raise HTTPException(
            status_code=a_result_playlist.get_http_code(),
            detail=a_result_playlist.message(),
        )

    playlist: PlaylistWithDetailsModel = a_result_playlist.result()
    a_result_owner = await UserAccess.get_user_from_id(
        session=session, user_id=playlist.owner_id
    )
    owner_name: str = "Unknown"
    if a_result_owner.is_ok():
        owner_name = a_result_owner.result().username

    return await get_playlist_response(
        session=session, playlist=playlist, owner_name=owner_name
    )


@router.delete("/{playlist_id}/contributor/{target_user_id}", response_model=OkResponse)
async def remove_contributor_async(
    request: Request, playlist_id: int, target_user_id: int
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.remove_contributor_async(
        session=session,
        playlist_id=playlist_id,
        owner_id=user.result().id,
        target_user_id=target_user_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing contributor. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post(
    "/{playlist_id}/media/{playlist_media_id}/disable", response_model=OkResponse
)
async def disable_media_async(
    request: Request, playlist_id: int, playlist_media_id: int
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.disable_media_for_user_async(
        session=session, user_id=user.result().id, playlist_media_id=playlist_media_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error disabling media. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post(
    "/{playlist_id}/media/{playlist_media_id}/enable", response_model=OkResponse
)
async def enable_media_async(
    request: Request, playlist_id: int, playlist_media_id: int
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.enable_media_for_user_async(
        session=session, user_id=user.result().id, playlist_media_id=playlist_media_id
    )
    if a_result.is_not_ok():
        logger.error(f"Error enabling media. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
