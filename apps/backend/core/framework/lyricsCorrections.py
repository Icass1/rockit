"""Provider-neutral, revision-bound overlays backed by existing reviewed requests."""

import hashlib
import json
import math
from dataclasses import dataclass

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.access.mediaAccess import MediaAccess
from core.access.requestAccess import RequestAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.models.lyricsCorrection import (
    LyricsCorrection,
    LyricsCorrectionLine,
    StoredLyricsCorrection,
)
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


def digest(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()


@dataclass
class LyricsContext:
    provider: str
    public_id: str
    lines: list[LyricsCorrectionLine]
    offset: float
    source_hash: str
    audio_identity: str | None
    revision: str | None
    approved: bool = False


def apply_overlay(context: LyricsContext, proposals: list[tuple[str, str]]) -> LyricsContext:
    """Apply the newest compatible approved proposal, never modifying source data."""
    latest: str | None = None
    if context.audio_identity:
        for public_id, payload in proposals:
            try:
                proposal = StoredLyricsCorrection.model_validate_json(payload)
            except ValidationError:
                continue  # Historical free-text requests are not executable patches.
            if (
                proposal.provider != context.provider
                or proposal.sourceHash != context.source_hash
                or proposal.audioIdentity != context.audio_identity
            ):
                continue
            context.lines = proposal.lines if proposal.lines is not None else context.lines
            context.offset = proposal.offset
            context.approved = True
            latest = public_id
            break
        context.revision = digest(value=[context.source_hash, context.audio_identity, latest])
    return context


class LyricsCorrections:
    @staticmethod
    async def for_public_id_async(
        session: AsyncSession,
        public_id: str,
        provider_name: str | None = None,
    ) -> Result[LyricsContext]:
        found = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=public_id,
            media_type_keys=[MediaTypeEnum.SONG],
        )
        if found.is_not_ok():
            logger.warning("Lyrics media unavailable: %s", found.info())
            return Result(code=found.code(), message=found.message())
        return await LyricsCorrections.context_async(
            session=session,
            media=found.result(),
            provider_name=provider_name,
        )

    @staticmethod
    async def context_async(
        session: AsyncSession, media: CoreMediaRow, provider_name: str | None = None
    ) -> Result[LyricsContext]:
        """Get originals and apply only reviewed corrections matching their current revision."""
        candidates = providers.get_lyrics_providers()
        if provider_name is not None:
            candidates = [p for p in candidates if p.get_name() == provider_name]
        if not candidates:
            logger.warning("Lyrics provider unavailable")
            return Result(code=ResultCode.NOT_FOUND, message="Lyrics provider unavailable")
        selected = candidates[0]
        lines: list[LyricsCorrectionLine] = []
        offset = 0.0
        public_id = media.public_id
        raw_source: object = None
        for provider in candidates:
            bundle = await provider.get_lyrics_bundle_async(session=session, media_ids=[media.id])
            if bundle.is_not_ok():
                logger.warning("Lyrics provider failed: %s", bundle.info())
                continue
            pair = bundle.result().get(media.id)
            if pair is None:
                continue
            plain, source = pair
            if source is not None:
                times = [line.timestamp_s for line in source.lines]
                raw_source = [
                    source.offset,
                    [(line.text, line.timestamp_s) for line in source.lines],
                ]
                valid = (
                    math.isfinite(source.offset)
                    and all(math.isfinite(time) and 0 <= time <= 86400 for time in times)
                    and times == sorted(times)
                )
                if not valid:
                    logger.warning(
                        "Invalid provider timing; retaining plain lyrics for %s", media.public_id
                    )
                lines = [
                    LyricsCorrectionLine(
                        text=line.text, timestamp_s=line.timestamp_s if valid else None
                    )
                    for line in source.lines
                ]
                offset = source.offset if valid else 0.0
                public_id = source.public_id
            elif plain is not None:
                lines = [LyricsCorrectionLine(text=line.text) for line in plain.lines]
                public_id = plain.public_id
            else:
                continue
            selected = provider
            break
        source_hash = digest(
            value=[
                media.public_id,
                selected.get_name(),
                public_id,
                offset,
                [line.model_dump() for line in lines],
                raw_source,
            ]
        )
        identity: str | None = None
        media_provider = providers.find_local_media_provider(provider_id=media.provider_id)
        if media_provider:
            audio = await media_provider.get_audio_identity_async(
                session=session, media_id=media.id
            )
            if audio.is_ok():
                identity = audio.result()
        accepted = await RequestAccess.get_accepted_lyrics_async(session=session, media_id=media.id)
        if accepted.is_not_ok():
            logger.error("Cannot load reviewed lyrics: %s", accepted.info())
            return Result(code=accepted.code(), message=accepted.message())
        context = LyricsContext(
            provider=selected.get_name(),
            public_id=public_id,
            lines=lines,
            offset=offset,
            source_hash=source_hash,
            audio_identity=identity,
            revision=None,
        )
        context = apply_overlay(
            context=context,
            proposals=[(row.public_id, row.proposed_value) for row in accepted.result()],
        )
        return Result(code=ResultCode.OK, message="OK", result=context)

    @staticmethod
    async def prepare_async(session: AsyncSession, media_id: int, payload: str) -> Result[str]:
        """Validate against a locked current snapshot, ignoring all client source claims."""
        try:
            proposal = LyricsCorrection.model_validate_json(payload)
        except ValidationError:
            logger.warning("Invalid lyrics correction proposal")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid lyrics correction")
        locked = await RequestAccess.lock_media_async(session=session, media_id=media_id)
        if locked.is_not_ok():
            logger.error("Cannot lock lyrics media: %s", locked.info())
            return Result(code=locked.code(), message=locked.message())
        if locked.result().media_type_key != MediaTypeEnum.SONG.value:
            logger.warning("Lyrics corrections require a song")
            return Result(code=ResultCode.BAD_REQUEST, message="Lyrics corrections require a song")
        snapshot = await LyricsCorrections.context_async(
            session=session, media=locked.result(), provider_name=proposal.provider
        )
        if snapshot.is_not_ok():
            logger.error("Cannot validate lyrics correction: %s", snapshot.info())
            return Result(code=snapshot.code(), message=snapshot.message())
        context = snapshot.result()
        if context.revision != proposal.revision or not context.audio_identity:
            logger.warning("Lyrics correction is stale or audio revision unavailable")
            return Result(
                code=ResultCode.BAD_REQUEST,
                message="Lyrics or audio changed; reload and propose again",
            )
        lines = proposal.lines if proposal.lines is not None else context.lines
        if not lines:
            logger.warning("An offset requires existing lyrics")
            return Result(code=ResultCode.BAD_REQUEST, message="No lyrics to adjust")
        # Store a full effective overlay so later offset-only proposals retain prior text edits.
        stored = StoredLyricsCorrection(
            **proposal.model_dump(exclude={"lines"}),
            lines=lines,
            sourceHash=context.source_hash,
            audioIdentity=context.audio_identity,
        )
        return Result(code=ResultCode.OK, message="OK", result=stored.model_dump_json())

    @staticmethod
    async def validate_review_async(
        session: AsyncSession, media_id: int, payload: str
    ) -> Result[bool]:
        """Revalidate pending proposals at approval; never execute historical arbitrary JSON."""
        try:
            stored = StoredLyricsCorrection.model_validate_json(payload)
        except ValidationError:
            logger.warning("Legacy/unstructured lyrics request requires a new proposal")
            return Result(
                code=ResultCode.BAD_REQUEST, message="Resubmit as a structured lyrics proposal"
            )
        prepared = await LyricsCorrections.prepare_async(
            session=session,
            media_id=media_id,
            payload=LyricsCorrection.model_validate(
                stored.model_dump(exclude={"sourceHash", "audioIdentity"})
            ).model_dump_json(),
        )
        if prepared.is_not_ok():
            logger.warning("Cannot approve correction: %s", prepared.info())
            return Result(code=prepared.code(), message=prepared.message())
        return Result(code=ResultCode.OK, message="OK", result=True)
