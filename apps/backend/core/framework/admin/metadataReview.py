import json
from datetime import date
from typing import cast

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.contentRatingAccess import ContentRatingAccess
from core.access.mediaAccess import MediaAccess
from core.access.requestAccess import RequestAccess
from core.enums.requestTypeEnum import RequestTypeEnum
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class MetadataReview:
    @staticmethod
    def changes(request_type: RequestTypeEnum, payload: str) -> Result[dict[str, str]]:
        try:
            fields = {
                RequestTypeEnum.TITLE: "title",
                RequestTypeEnum.ARTIST: "artist",
                RequestTypeEnum.ALBUM: "album",
                RequestTypeEnum.GENRE: "genre",
            }
            raw: object = (
                json.loads(payload)
                if request_type == RequestTypeEnum.METADATA
                else {fields[request_type]: payload}
            )
            if not isinstance(raw, dict) or not raw:
                raise ValueError("Empty metadata")
            allowed = {"title", "artist", "album", "genre", "releaseDate", "explicit"}
            entries = cast(dict[str, object], raw)
            if set(entries) - allowed:
                raise ValueError("Unsupported metadata field")
            changes: dict[str, str] = {}
            for key, value in entries.items():
                if key == "explicit":
                    continue
                if not isinstance(value, str) or not value.strip() or len(value) > 2000:
                    raise ValueError("Invalid metadata value")
                changes[key] = value.strip()
            if "releaseDate" in changes:
                date.fromisoformat(changes["releaseDate"])
            return Result[dict[str, str]].ok(changes)
        except (ValueError, TypeError, KeyError):
            logger.warning("Unsupported or invalid metadata proposal")
            return Result(
                code=ResultCode.BAD_REQUEST, message="ADMIN_METADATA_INVALID"
            )

    @staticmethod
    async def apply_async(
        session: AsyncSession, media_id: int, changes: dict[str, str]
    ) -> Result[bool]:
        from core.framework import providers

        changes = dict(changes)
        genre = changes.pop("genre", None)
        if genre is not None:
            recorded = await ContentRatingAccess.record_genre_async(
                session=session, media_id=media_id, genre=genre
            )
            if recorded.is_not_ok():
                logger.warning("Cannot apply reviewed genre: %s", recorded.info())
                return recorded
        if not changes:
            return Result[bool].ok(True)

        identity = await RequestAccess.get_media_public_id_from_id_async(
            session=session, media_id=media_id
        )
        if identity.is_not_ok():
            logger.warning("Metadata identity unavailable: %s", identity.info())
            return Result[bool].from_result(identity)
        media = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=identity.result(), media_type_keys=None
        )
        if media.is_not_ok():
            logger.warning("Metadata media unavailable: %s", media.info())
            return Result[bool].from_result(media)
        provider = providers.find_local_media_provider(media.result().provider_id)
        if provider is None:
            logger.warning("Metadata provider unavailable")
            return Result(code=ResultCode.BAD_REQUEST, message="ADMIN_METADATA_UNSUPPORTED")
        return await provider.apply_metadata_review_async(
            session=session, public_id=identity.result(), changes=changes
        )
