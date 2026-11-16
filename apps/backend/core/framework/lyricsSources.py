"""Resolve source suggestions and expose provisional snapshots to their authors."""

import json
from typing import cast

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.requestAccess import RequestAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.models.lyricsSource import LyricsSource, StoredLyricsSource
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class LyricsSources:
    @staticmethod
    def is_proposal(payload: str) -> bool:
        try:
            value = json.loads(payload)
            return (
                isinstance(value, dict)
                and cast(dict[str, object], value).get("kind") == "lyrics_source"
            )
        except ValueError:
            return False

    @staticmethod
    async def validate_media_async(session: AsyncSession, media_id: int) -> Result[bool]:
        found = await RequestAccess.lock_media_async(session=session, media_id=media_id)
        if found.is_not_ok():
            logger.warning("Lyrics source media unavailable: %s", found.info())
            return Result(code=found.code(), message=found.message())
        if found.result().media_type_key != MediaTypeEnum.SONG.value:
            logger.warning("Lyrics source suggestions require a song")
            return Result(code=ResultCode.BAD_REQUEST, message="Lyrics sources require a song")
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def prepare_async(session: AsyncSession, media_id: int, payload: str) -> Result[str]:
        try:
            proposal = LyricsSource.model_validate_json(payload)
        except ValidationError:
            logger.warning("Invalid lyrics source suggestion")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid lyrics source")
        valid = await LyricsSources.validate_media_async(session=session, media_id=media_id)
        if valid.is_not_ok():
            return Result(code=valid.code(), message=valid.message())
        provider = next(
            (p for p in providers.get_lyrics_providers() if p.get_name() == proposal.provider), None
        )
        if provider is None:
            logger.warning("Requested lyrics provider unavailable")
            return Result(code=ResultCode.NOT_FOUND, message="Lyrics provider unavailable")
        source = await provider.get_lyrics_source_async(source_id=proposal.sourceId)
        if source.is_not_ok():
            logger.warning("Lyrics source lookup failed: %s", source.info())
            return Result(code=source.code(), message=source.message())
        snapshot = source.result()
        if snapshot.sourceId != proposal.sourceId or snapshot.provider != proposal.provider:
            logger.error("Lyrics source provider returned a different identity")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid lyrics source identity")
        return Result(code=ResultCode.OK, message="OK", result=snapshot.model_dump_json())

    @staticmethod
    def discard_text(payload: str) -> str:
        """Keep the audit reference but remove rejected provisional lyric content."""
        stored = StoredLyricsSource.model_validate_json(payload)
        proposal = LyricsSource(
            kind=stored.kind, provider=stored.provider, sourceId=stored.sourceId
        )
        return proposal.model_dump_json()

    @staticmethod
    async def validate_review_async(
        session: AsyncSession, media_id: int, payload: str
    ) -> Result[bool]:
        try:
            StoredLyricsSource.model_validate_json(payload)
        except ValidationError:
            logger.warning("Lyrics source review requires a resolved snapshot")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid lyrics source snapshot")
        # Approve exactly the server snapshot shown to the reviewer, not mutable API text.
        return await LyricsSources.validate_media_async(session=session, media_id=media_id)
