from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.navigationPinAccess import NavigationPinAccess
from core.framework.media.image import Image
from core.models.navigationPin import ROCKIT_NAVIGATION_LISTS
from core.responses.navigationPinsResponse import NavigationPinResponse, NavigationPinsResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)
_TYPES: dict[int, Literal["artist", "album", "playlist"]] = {1: "artist", 2: "album", 3: "playlist"}


class NavigationPins:
    @staticmethod
    async def list_async(session: AsyncSession, user_id: int) -> Result[NavigationPinsResponse]:
        """Resolve all pin covers in one batch, without hydrating collections."""
        records = await NavigationPinAccess.list_async(session=session, user_id=user_id)
        if records.is_not_ok():
            logger.error(f"Navigation pins lookup failed: {records.info()}")
            return Result(code=records.code(), message=records.message())
        builtins = await NavigationPinAccess.list_builtin_async(session=session, user_id=user_id)
        if builtins.is_not_ok():
            logger.error(f"Rockit navigation list lookup failed: {builtins.info()}")
            return Result(code=builtins.code(), message=builtins.message())
        shortcuts = [
            NavigationPinResponse(
                type="playlist",
                publicId=key,
                name=name,
                imageUrl="/rockit-background.png",
                url=f"/playlist/{key}",
                builtinKey=key,
            )
            for key, name in ROCKIT_NAVIGATION_LISTS.items()
            if key in builtins.result()
        ]
        entries = records.result()
        images = await Image.get_internal_image_urls_by_ids_async(
            session=session, image_ids=[entry.image_id for entry in entries]
        )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=NavigationPinsResponse(
                pins=shortcuts
                + [
                    NavigationPinResponse(
                        type=_TYPES[entry.media_type_key],
                        publicId=entry.public_id,
                        name=entry.name,
                        imageUrl=images.get(entry.image_id) if entry.image_id is not None else None,
                        url=f"/{_TYPES[entry.media_type_key]}/{entry.public_id}",
                    )
                    for entry in entries
                ]
            ),
        )

    @staticmethod
    async def set_async(
        session: AsyncSession, user_id: int, public_id: str, pinned: bool
    ) -> Result[NavigationPinsResponse]:
        """Change a personal reference and return the authoritative visible list."""
        if public_id in ROCKIT_NAVIGATION_LISTS:
            if pinned:
                saved = await NavigationPinAccess.add_builtins_async(
                    session=session, user_id=user_id, keys=[public_id]
                )
            else:
                saved = await NavigationPinAccess.remove_builtin_async(
                    session=session, user_id=user_id, key=public_id
                )
        else:
            method = NavigationPinAccess.add_async if pinned else NavigationPinAccess.remove_async
            saved = await method(session=session, user_id=user_id, public_id=public_id)
        if saved.is_not_ok():
            logger.error(f"Navigation pin update failed: {saved.info()}")
            return Result(code=saved.code(), message=saved.message())
        return await NavigationPins.list_async(session=session, user_id=user_id)
