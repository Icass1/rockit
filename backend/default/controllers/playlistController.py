from logging import Logger
from typing import List
from fastapi import Depends, APIRouter, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.default.framework.default import Default
from backend.utils.logger import getLogger

from backend.core.aResult import AResult

from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.userAccess import UserAccess

from backend.core.responses.okResponse import OkResponse
from backend.core.responses.basePlaylistResponse import BasePlaylistResponse

from backend.default.framework.playlist import Playlist
from backend.default.framework.models.playlist import (
    PlaylistModel,
    PlaylistWithDetailsModel,
    PlaylistMediaAddModel,
    PlaylistContributorAddModel,
)
from backend.default.requests.playlistRequest import (
    CreatePlaylistRequest,
    UpdatePlaylistRequest,
    AddMediaToPlaylistRequest,
    AddContributorRequest,
)


async def get_playlist_list_response(
    session: AsyncSession,
    playlists: List[PlaylistModel],
) -> List[BasePlaylistResponse]:
    """Build a list of BasePlaylistResponse from PlaylistModels."""

    from backend.core.access.userAccess import UserAccess

    result: List[BasePlaylistResponse] = []
    for p in playlists:
        a_result_owner: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=p.owner_id
        )
        owner_name: str = "Unknown"
        if a_result_owner.is_ok():
            owner_name = a_result_owner.result().username

        result.append(
            BasePlaylistResponse(
                type="playlist",
                description=p.description,
                provider=Default.provider_name,
                publicId=p.public_id,
                url=f"/playlist/{p.public_id}",
                providerUrl="",
                name=p.name,
                medias=[],
                contributors=[],
                imageUrl=p.image_url,
                owner=owner_name,
            )
        )
    return result


logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/default/playlist",
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
        is_public=create_request.isPublic,
    )
    if a_result.is_not_ok():
        logger.error(f"Error creating playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    playlist: PlaylistModel = a_result.result()
    return BasePlaylistResponse(
        type="playlist",
        description=playlist.description,
        provider=Default.provider_name,
        publicId=playlist.public_id,
        url=f"/playlist/{playlist.public_id}",
        providerUrl="",
        name=playlist.name,
        medias=[],
        contributors=[],
        imageUrl=playlist.image_url,
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


@router.get("/{playlist_public_id}", response_model=BasePlaylistResponse)
async def get_playlist_async(
    request: Request, playlist_public_id: str
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistWithDetailsModel] = await Playlist.get_playlist_async(
        session=session, playlist_public_id=playlist_public_id, user_id=user.result().id
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

    a_result_response: AResult[BasePlaylistResponse] = (
        await Playlist.build_playlist_response_async(
            session=session, playlist=playlist, owner_name=owner_name
        )
    )
    if a_result_response.is_not_ok():
        raise HTTPException(status_code=500, detail=a_result_response.message())
    return a_result_response.result()


@router.patch("/{playlist_public_id}", response_model=BasePlaylistResponse)
async def update_playlist_async(
    request: Request, playlist_public_id: str, update_request: UpdatePlaylistRequest
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistModel] = await Playlist.update_playlist_async(
        session=session,
        playlist_public_id=playlist_public_id,
        user_id=user.result().id,
        name=update_request.name,
        description=update_request.description,
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
            session=session,
            playlist_public_id=playlist_public_id,
            user_id=user.result().id,
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

        a_result_response: AResult[BasePlaylistResponse] = (
            await Playlist.build_playlist_response_async(
                session=session, playlist=playlist_details, owner_name=owner_name
            )
        )
        if a_result_response.is_not_ok():
            raise HTTPException(status_code=500, detail=a_result_response.message())
        return a_result_response.result()

    return BasePlaylistResponse(
        type="playlist",
        description=playlist.description,
        provider=Default.provider_name,
        publicId=playlist.public_id,
        url=f"/playlist/{playlist.public_id}",
        providerUrl="",
        name=playlist.name,
        medias=[],
        contributors=[],
        imageUrl=playlist.image_url,
        owner=user.result().username,
    )


@router.delete("/{playlist_public_id}", response_model=OkResponse)
async def delete_playlist_async(
    request: Request, playlist_public_id: str
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.delete_playlist_async(
        session=session, playlist_public_id=playlist_public_id, user_id=user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error deleting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post("/{playlist_public_id}/media", response_model=BasePlaylistResponse)
async def add_media_to_playlist_async(
    request: Request, playlist_public_id: str, media_request: AddMediaToPlaylistRequest
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistMediaAddModel] = (
        await Playlist.add_media_to_playlist_async(
            session=session,
            playlist_public_id=playlist_public_id,
            user_id=user.result().id,
            media_public_id=media_request.playlist_media_public_id,
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding media to playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    a_result_playlist: AResult[PlaylistWithDetailsModel] = (
        await Playlist.get_playlist_async(
            session=session,
            playlist_public_id=playlist_public_id,
            user_id=user.result().id,
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

    a_result_response: AResult[BasePlaylistResponse] = (
        await Playlist.build_playlist_response_async(
            session=session, playlist=playlist, owner_name=owner_name
        )
    )
    if a_result_response.is_not_ok():
        raise HTTPException(status_code=500, detail=a_result_response.message())
    return a_result_response.result()


@router.delete(
    "/{playlist_public_id}/media/{playlist_media_public_id}", response_model=OkResponse
)
async def remove_media_from_playlist_async(
    request: Request, playlist_public_id: str, playlist_media_public_id: str
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    from backend.default.framework.playlist import Playlist

    a_result: AResult[bool] = await Playlist.remove_media_from_playlist_async(
        session=session,
        playlist_public_id=playlist_public_id,
        media_public_id=playlist_media_public_id,
        user_id=user.result().id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing media from playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post("/{playlist_public_id}/contributor", response_model=BasePlaylistResponse)
async def add_contributor_async(
    request: Request,
    playlist_public_id: str,
    contributor_request: AddContributorRequest,
) -> BasePlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[PlaylistContributorAddModel] = (
        await Playlist.add_contributor_async(
            session=session,
            playlist_public_id=playlist_public_id,
            owner_id=user.result().id,
            new_user_public_id=contributor_request.user_public_id,
            role=contributor_request.role,
        )
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding contributor. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    a_result_playlist: AResult[PlaylistWithDetailsModel] = (
        await Playlist.get_playlist_async(
            session=session,
            playlist_public_id=playlist_public_id,
            user_id=user.result().id,
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

    a_result_response: AResult[BasePlaylistResponse] = (
        await Playlist.build_playlist_response_async(
            session=session, playlist=playlist, owner_name=owner_name
        )
    )
    if a_result_response.is_not_ok():
        raise HTTPException(status_code=500, detail=a_result_response.message())
    return a_result_response.result()


@router.delete(
    "/{playlist_public_id}/contributor/{target_user_public_id}",
    response_model=OkResponse,
)
async def remove_contributor_async(
    request: Request, playlist_public_id: str, target_user_public_id: str
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.remove_contributor_async(
        session=session,
        playlist_public_id=playlist_public_id,
        owner_id=user.result().id,
        target_user_public_id=target_user_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error removing contributor. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post(
    "/{playlist_public_id}/media/{playlist_media_public_id}/disable",
    response_model=OkResponse,
)
async def disable_media_async(
    request: Request, playlist_public_id: str, playlist_media_public_id: str
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.disable_media_for_user_async(
        session=session,
        playlist_public_id=playlist_public_id,
        user_id=user.result().id,
        playlist_media_public_id=playlist_media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error disabling media. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()


@router.post(
    "/{playlist_public_id}/media/{playlist_media_public_id}/enable",
    response_model=OkResponse,
)
async def enable_media_async(
    request: Request, playlist_public_id: str, playlist_media_public_id: str
) -> OkResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[bool] = await Playlist.enable_media_for_user_async(
        session=session,
        playlist_public_id=playlist_public_id,
        user_id=user.result().id,
        playlist_media_public_id=playlist_media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error enabling media. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return OkResponse()
