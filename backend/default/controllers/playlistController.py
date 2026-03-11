from logging import Logger
from typing import Any, Dict, List
from fastapi import Depends, APIRouter, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.middlewares.authMiddleware import AuthMiddleware
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.core.responses.okResponse import OkResponse

from backend.default.framework.playlist import Playlist
from backend.default.request.playlistRequest import (
    CreatePlaylistRequest,
    UpdatePlaylistRequest,
    AddMediaToPlaylistRequest,
    AddContributorRequest,
)
from backend.default.responses.playlistResponse import (
    PlaylistResponse,
    PlaylistListResponse,
)

logger: Logger = getLogger(__name__)
router = APIRouter(
    prefix="/playlist",
    dependencies=[Depends(dependency=AuthMiddleware.auth_dependency)],
    tags=["Playlist"],
)


@router.post("/", response_model=PlaylistResponse)
async def create_playlist_async(
    request: Request, create_request: CreatePlaylistRequest
) -> PlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[Dict[str, Any]] = await Playlist.create_playlist_async(
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

    result_dict: Dict[str, Any] = a_result.result()
    result_dict["medias"] = []
    result_dict["contributors"] = []
    return PlaylistResponse(**result_dict)


@router.get("/", response_model=PlaylistListResponse)
async def get_user_playlists_async(request: Request) -> PlaylistListResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[List[Dict[str, Any]]] = await Playlist.get_user_playlists_async(
        session=session, user_id=user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlists. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    playlists: List[Dict[str, Any]] = a_result.result()
    playlist_responses: List[PlaylistResponse] = []
    for p in playlists:
        playlist_dict: Dict[str, Any] = {
            "id": p["id"],
            "public_id": p["public_id"],
            "name": p["name"],
            "description": p["description"],
            "cover_image": p["cover_image"],
            "is_public": p["is_public"],
            "owner_id": p["owner_id"],
            "date_added": p["date_added"],
            "date_updated": p["date_updated"],
            "medias": [],
            "contributors": [],
        }
        playlist_responses.append(PlaylistResponse(**playlist_dict))
    return PlaylistListResponse(playlists=playlist_responses)


@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist_async(request: Request, playlist_id: int) -> PlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[Dict[str, Any]] = await Playlist.get_playlist_async(
        session=session, playlist_id=playlist_id, user_id=user.result().id
    )
    if a_result.is_not_ok():
        logger.error(f"Error getting playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    return PlaylistResponse(**a_result.result())


@router.patch("/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist_async(
    request: Request, playlist_id: int, update_request: UpdatePlaylistRequest
) -> PlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[Dict[str, Any]] = await Playlist.update_playlist_async(
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

    result_dict: Dict[str, Any] = a_result.result()
    a_result_medias: AResult[Dict[str, Any]] = await Playlist.get_playlist_async(
        session=session, playlist_id=playlist_id, user_id=user.result().id
    )
    if a_result_medias.is_ok():
        result_dict["medias"] = a_result_medias.result().get("medias", [])
        result_dict["contributors"] = a_result_medias.result().get("contributors", [])

    return PlaylistResponse(**result_dict)


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


@router.post("/{playlist_id}/media", response_model=PlaylistResponse)
async def add_media_to_playlist_async(
    request: Request, playlist_id: int, media_request: AddMediaToPlaylistRequest
) -> PlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[Dict[str, Any]] = await Playlist.add_media_to_playlist_async(
        session=session,
        playlist_id=playlist_id,
        user_id=user.result().id,
        media_public_id=media_request.media_public_id,
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding media to playlist. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    a_result_playlist: AResult[Dict[str, Any]] = await Playlist.get_playlist_async(
        session=session, playlist_id=playlist_id, user_id=user.result().id
    )
    if a_result_playlist.is_not_ok():
        raise HTTPException(
            status_code=a_result_playlist.get_http_code(),
            detail=a_result_playlist.message(),
        )

    return PlaylistResponse(**a_result_playlist.result())


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


@router.post("/{playlist_id}/contributor", response_model=PlaylistResponse)
async def add_contributor_async(
    request: Request, playlist_id: int, contributor_request: AddContributorRequest
) -> PlaylistResponse:
    session: AsyncSession = DBSessionMiddleware.get_session(request=request)
    user = AuthMiddleware.get_current_user(request)
    if user.is_not_ok():
        raise HTTPException(status_code=401, detail="Not authenticated.")

    a_result: AResult[Dict[str, Any]] = await Playlist.add_contributor_async(
        session=session,
        playlist_id=playlist_id,
        owner_id=user.result().id,
        new_user_id=contributor_request.user_id,
        role_key=contributor_request.role_key,
    )
    if a_result.is_not_ok():
        logger.error(f"Error adding contributor. {a_result.info()}")
        raise HTTPException(
            status_code=a_result.get_http_code(), detail=a_result.message()
        )

    a_result_playlist: AResult[Dict[str, Any]] = await Playlist.get_playlist_async(
        session=session, playlist_id=playlist_id, user_id=user.result().id
    )
    if a_result_playlist.is_not_ok():
        raise HTTPException(
            status_code=a_result_playlist.get_http_code(),
            detail=a_result_playlist.message(),
        )

    return PlaylistResponse(**a_result_playlist.result())


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
