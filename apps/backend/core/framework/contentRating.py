import json
from typing import TypeVar, cast

from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.contentRatingAccess import ContentRatingAccess
from core.access.mediaAccess import MediaAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.requests.contentRatingRequest import UpdateContentRatingRequest
from core.responses.baseSongWithoutAlbumResponse import BaseSongWithoutAlbumResponse
from core.responses.contentRatingResponse import (
    ContentRatingBackfillResponse,
    ContentRatingLookupResponse,
    ContentRatingResponse,
)
from logger import getLogger
from result import Result, ResultCode

T = TypeVar("T", bound=BaseModel)
logger = getLogger(__name__)


class ContentRatings:
    @staticmethod
    def parse_metadata_rating(payload: str) -> Result[list[UpdateContentRatingRequest]]:
        """Validate a proposed rating while preserving other metadata fields."""
        try:
            changes: object = json.loads(payload)
            if not isinstance(changes, dict):
                raise ValueError("Metadata must be a JSON object")
            rating = (
                UpdateContentRatingRequest.model_validate(
                    {"value": cast(dict[str, object], changes)["explicit"]}
                )
                if "explicit" in changes
                else None
            )
        except (ValueError, TypeError, ValidationError):
            logger.warning("Invalid metadata content-rating proposal")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid metadata content rating")
        return Result(code=ResultCode.OK, message="OK", result=[rating] if rating else [])

    @staticmethod
    async def record_async(
        session: AsyncSession, public_id: str, value: bool | None, source: str, manual: bool = False
    ) -> ResultCode:
        media = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=[MediaTypeEnum.SONG]
        )
        if media.is_not_ok():
            logger.warning("Cannot rate an unavailable song: %s", media.info())
            return ResultCode(code=media.code(), message=media.message())
        return await ContentRatingAccess.record_async(
            session=session,
            media_id=media.result().id,
            is_explicit=value,
            source=source,
            is_manual=manual,
        )

    @staticmethod
    async def lookup_async(
        session: AsyncSession, public_ids: list[str]
    ) -> Result[ContentRatingLookupResponse]:
        ids = list(dict.fromkeys(public_ids))
        media = await MediaAccess.get_medias_from_public_ids_async(
            session=session, public_ids=ids, media_type_keys=[MediaTypeEnum.SONG]
        )
        if media.is_not_ok():
            logger.warning("Content rating songs unavailable: %s", media.info())
            return Result(code=media.code(), message=media.message())
        valid_ids = {row.public_id for row in media.result()}
        ratings = await ContentRatingAccess.get_batch_async(
            session=session, public_ids=list(valid_ids)
        )
        if ratings.is_not_ok():
            logger.error("Content ratings unavailable: %s", ratings.info())
            return Result(code=ratings.code(), message=ratings.message())
        items: list[ContentRatingResponse] = []
        for public_id in ids:
            if public_id not in valid_ids:
                continue
            row = ratings.result().get(public_id)
            items.append(
                ContentRatingResponse(
                    publicId=public_id,
                    explicit=row.is_explicit if row else None,
                    source=row.explicit_source if row else None,
                    manual=row.explicit_manual if row else False,
                )
            )
        return Result(
            code=ResultCode.OK, message="OK", result=ContentRatingLookupResponse(items=items)
        )

    @staticmethod
    async def enrich_async(session: AsyncSession, response: T) -> Result[T]:
        songs: dict[str, list[BaseSongWithoutAlbumResponse]] = {}

        def collect(value: object) -> None:
            if isinstance(value, BaseSongWithoutAlbumResponse):
                songs.setdefault(value.publicId, []).append(value)
            if isinstance(value, BaseModel):
                for name in type(value).model_fields:
                    collect(getattr(value, name))
            elif isinstance(value, (list, tuple)):
                for child in cast(list[object] | tuple[object, ...], value):
                    collect(child)

        collect(response)
        if not songs:
            return Result(code=ResultCode.OK, message="OK", result=response)
        ratings = await ContentRatingAccess.get_batch_async(session=session, public_ids=list(songs))
        if ratings.is_not_ok():
            logger.error("Could not read recording content ratings: %s", ratings.info())
            return Result(code=ratings.code(), message=ratings.message())
        for public_id, rows in songs.items():
            rating = ratings.result().get(public_id)
            for song in rows:
                song.explicit = rating.is_explicit if rating else None
                song.explicitSource = rating.explicit_source if rating else None
        return Result(code=ResultCode.OK, message="OK", result=response)

    @staticmethod
    async def backfill_async(
        session: AsyncSession, after: str, limit: int, allow_remote: bool = False
    ) -> Result[ContentRatingBackfillResponse]:
        from core.framework import providers

        page = await ContentRatingAccess.page_songs_async(
            session=session, after=after, limit=limit + 1
        )
        if page.is_not_ok():
            logger.error("Rating backfill page failed: %s", page.info())
            return Result(code=page.code(), message=page.message())
        rows = page.result()[:limit]
        known = await ContentRatingAccess.get_batch_async(
            session=session, public_ids=[row.public_id for row in rows]
        )
        if known.is_not_ok():
            logger.error("Rating backfill state failed: %s", known.info())
            return Result(code=known.code(), message=known.message())
        grouped: dict[int, list[str]] = {}
        for row in rows:
            rating = known.result().get(row.public_id)
            if rating and rating.explicit_manual:
                continue
            grouped.setdefault(row.provider_id, []).append(row.public_id)
        processed = 0
        for provider_id, ids in grouped.items():
            provider = providers.find_media_provider(provider_id)
            if provider is None:
                continue
            local = await provider.get_local_songs_async(session=session, public_ids=ids)
            if local.is_not_ok():
                logger.warning("Rating backfill local read failed: %s", local.info())
                return Result(code=local.code(), message=local.message())
            downloaded = [song.publicId for song in local.result() if song.downloaded]
            if not downloaded:
                continue
            evidence = await provider.get_content_rating_evidence_async(
                session=session, public_ids=downloaded, allow_remote=allow_remote
            )
            if evidence.is_not_ok():
                logger.warning("Rating evidence unavailable: %s", evidence.info())
                return Result(code=evidence.code(), message=evidence.message())
            row_ids = {row.public_id: row.id for row in rows}
            changes = [
                (
                    row_ids[public_id],
                    evidence.result().get(public_id),
                    f"provider:{provider_id}:catalog",
                )
                for public_id in downloaded
            ]
            recorded = await ContentRatingAccess.record_batch_async(
                session=session, evidence=changes
            )
            if recorded.is_not_ok():
                logger.error("Rating batch write failed: %s", recorded.info())
                return Result(code=recorded.code(), message=recorded.message())
            processed += len(changes)
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=ContentRatingBackfillResponse(
                nextAfter=rows[-1].public_id if rows else after,
                hasMore=len(page.result()) > limit,
                examined=len(rows),
                processed=processed,
            ),
        )

    @staticmethod
    async def ingest_download_async(session: AsyncSession, public_id: str) -> ResultCode:
        from core.framework import providers

        media = await MediaAccess.get_media_from_public_id_async(
            session=session, public_id=public_id, media_type_keys=[MediaTypeEnum.SONG]
        )
        if media.is_not_ok():
            # Video/album download completions have no song classification.
            if media.code() == ResultCode.NOT_FOUND:
                return ResultCode(code=ResultCode.OK, message="Not a song")
            logger.warning("Content rating identity unavailable: %s", media.info())
            return ResultCode(code=media.code(), message=media.message())
        row = media.result()
        if row.explicit_manual or row.is_explicit is not None:
            return ResultCode(code=ResultCode.OK, message="Existing rating preserved")
        provider = providers.find_media_provider(row.provider_id)
        evidence = (
            await provider.get_content_rating_evidence_async(
                session=session, public_ids=[public_id], allow_remote=True
            )
            if provider
            else None
        )
        flag = None
        if evidence is not None and evidence.is_ok():
            flag = evidence.result().get(public_id)
        elif evidence is not None:
            logger.warning("Optional content rating source failed: %s", evidence.info())
        return await ContentRatingAccess.record_batch_async(
            session=session, evidence=[(row.id, flag, f"provider:{row.provider_id}:catalog")]
        )
