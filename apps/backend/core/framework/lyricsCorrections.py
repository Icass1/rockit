"""Provider-neutral, revision-bound overlays backed by existing reviewed requests."""

import hashlib
import json
import math
from collections import defaultdict, deque
from dataclasses import dataclass

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.userRequest import UserRequestRow
from core.access.mediaAccess import MediaAccess
from core.access.requestAccess import RequestAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.models.lyricsCorrection import (
    LyricsCorrection,
    LyricsCorrectionLine,
    StoredLyricsCorrection,
)
from core.models.lyricsSource import StoredLyricsSource
from core.models.playbackLyricsLine import PlaybackLyricsLine
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


def digest(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, ensure_ascii=False, sort_keys=True).encode()
    ).hexdigest()


def source_line_payload(line: PlaybackLyricsLine) -> dict[str, object]:
    """Keep revisions of legacy line-only sources stable as playback fields grow."""
    value: dict[str, object] = line.model_dump(exclude={"words", "end_timestamp_s"})
    if line.words:
        value["words"] = [word.model_dump() for word in line.words]
    if line.end_timestamp_s is not None:
        value["end_timestamp_s"] = line.end_timestamp_s
    return value


@dataclass
class LyricsContext:
    provider: str
    public_id: str
    lines: list[PlaybackLyricsLine]
    offset: float
    source_hash: str
    audio_identity: str | None
    revision: str | None
    approved: bool = False
    pending: bool = False


def correction_lines(
    source: list[PlaybackLyricsLine], proposal: list[LyricsCorrectionLine]
) -> list[PlaybackLyricsLine]:
    """Resolve legacy line-only edits against matching source lines."""
    originals: dict[tuple[str, float | None], deque[PlaybackLyricsLine]] = defaultdict(deque)
    for line in source:
        originals[line.text, line.timestamp_s].append(line)
    corrected: list[PlaybackLyricsLine] = []
    for line in proposal:
        matches = originals[line.text, line.timestamp_s]
        original = matches.popleft() if matches else None
        if line.words is None and line.end_timestamp_s is None and original is not None:
            corrected.append(original)
        else:
            corrected.append(
                PlaybackLyricsLine(
                    text=line.text,
                    timestamp_s=line.timestamp_s,
                    words=line.words or [],
                    end_timestamp_s=line.end_timestamp_s,
                )
            )
    return corrected


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
            if proposal.lines is not None:
                context.lines = correction_lines(source=context.lines, proposal=proposal.lines)
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
        viewer_id: int | None = None,
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
            viewer_id=viewer_id,
        )

    @staticmethod
    async def context_async(
        session: AsyncSession,
        media: CoreMediaRow,
        provider_name: str | None = None,
        viewer_id: int | None = None,
    ) -> Result[LyricsContext]:
        """Resolve approved text, or the viewer's provisional source, then compatible overlays."""
        candidates = providers.get_lyrics_providers()
        if provider_name is not None:
            candidates = [p for p in candidates if p.get_name() == provider_name]
        if not candidates:
            logger.warning("Lyrics provider unavailable")
            return Result(code=ResultCode.NOT_FOUND, message="Lyrics provider unavailable")
        accepted = await RequestAccess.get_accepted_lyrics_async(session=session, media_id=media.id)
        if accepted.is_not_ok():
            logger.error("Cannot load reviewed lyrics: %s", accepted.info())
            return Result(code=accepted.code(), message=accepted.message())
        pending_rows: list[UserRequestRow] = []
        if viewer_id is not None:
            pending_result = await RequestAccess.get_pending_lyrics_async(
                session=session, media_id=media.id, user_id=viewer_id
            )
            if pending_result.is_not_ok():
                logger.warning("Cannot load provisional lyrics: %s", pending_result.info())
                return Result(code=pending_result.code(), message=pending_result.message())
            pending_rows = pending_result.result()
        pending_ids = {row.public_id for row in pending_rows}
        reviewed_source: tuple[str, StoredLyricsSource] | None = None
        for row in [*pending_rows, *accepted.result()]:
            try:
                candidate_source = StoredLyricsSource.model_validate_json(row.proposed_value)
            except ValidationError:
                continue
            if provider_name is None or candidate_source.provider == provider_name:
                reviewed_source = (row.public_id, candidate_source)
                break
        selected = candidates[0]
        lines: list[PlaybackLyricsLine] = []
        offset = 0.0
        public_id = media.public_id
        raw_source: object = None
        for provider in [] if reviewed_source else candidates:
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
                    PlaybackLyricsLine(
                        text=line.text,
                        timestamp_s=line.timestamp_s if valid else None,
                        words=line.words if valid else [],
                        end_timestamp_s=line.end_timestamp_s if valid else None,
                    )
                    for line in source.lines
                ]
                offset = source.offset if valid else 0.0
                public_id = source.public_id
            elif plain is not None:
                lines = [PlaybackLyricsLine(text=line.text) for line in plain.lines]
                public_id = plain.public_id
            else:
                continue
            selected = provider
            break
        if reviewed_source:
            request_id, approved_source = reviewed_source
            selected = next(
                (p for p in candidates if p.get_name() == approved_source.provider), selected
            )
            public_id = str(approved_source.sourceId)
            lines = approved_source.lines
            offset = approved_source.offset
            source_payload = approved_source.model_dump()
            source_payload["lines"] = [source_line_payload(line=line) for line in lines]
            raw_source = [request_id, source_payload]
        source_hash = digest(
            value=[
                media.public_id,
                selected.get_name(),
                public_id,
                offset,
                [source_line_payload(line=line) for line in lines],
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
        context = LyricsContext(
            provider=selected.get_name(),
            public_id=public_id,
            lines=lines,
            offset=offset,
            source_hash=source_hash,
            audio_identity=identity,
            revision=None,
            approved=reviewed_source is not None and reviewed_source[0] not in pending_ids,
            pending=reviewed_source is not None and reviewed_source[0] in pending_ids,
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
            return Result(code=ResultCode.BAD_REQUEST, message="LYRICS_INVALID_CORRECTION")
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
                message="LYRICS_STALE_PROPOSAL",
            )
        lines = (
            correction_lines(source=context.lines, proposal=proposal.lines)
            if proposal.lines is not None
            else context.lines
        )
        if not lines:
            logger.warning("An offset requires existing lyrics")
            return Result(code=ResultCode.BAD_REQUEST, message="No lyrics to adjust")
        # Store a full effective overlay so later offset-only proposals retain prior text edits.
        try:
            stored = StoredLyricsCorrection(
                **proposal.model_dump(exclude={"lines"}),
                lines=[LyricsCorrectionLine.model_validate(line.model_dump()) for line in lines],
                sourceHash=context.source_hash,
                audioIdentity=context.audio_identity,
            )
        except ValidationError:
            logger.warning("Effective lyrics correction is invalid")
            return Result(code=ResultCode.BAD_REQUEST, message="LYRICS_INVALID_CORRECTION")
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
            return Result(code=ResultCode.BAD_REQUEST, message="LYRICS_LEGACY_PROPOSAL")
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
