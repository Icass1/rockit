"""Revision safety and moderation behavior without database or media services."""

from datetime import UTC, datetime
from typing import cast

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.userRequest import UserRequestRow
from core.access.requestAccess import RequestAccess
from core.enums.requestStatusEnum import RequestStatusEnum
from core.enums.requestTypeEnum import RequestTypeEnum
from core.framework.admin import userRequest
from core.framework.lyricsCorrections import LyricsContext, LyricsCorrections, apply_overlay
from core.models.lyricsCorrection import (
    LyricsCorrection,
    LyricsCorrectionLine,
    StoredLyricsCorrection,
)
from core.responses.userRequestResponse import UserRequestResponse
from result import Result, ResultCode


def context() -> LyricsContext:
    return LyricsContext(
        provider="LRCLIB",
        public_id="original",
        offset=0,
        source_hash="source-a",
        audio_identity="audio-a",
        revision=None,
        lines=[LyricsCorrectionLine(text="Original", timestamp_s=10)],
    )


def proposal(**updates: object) -> StoredLyricsCorrection:
    values: dict[str, object] = dict(
        provider="LRCLIB",
        revision="a" * 64,
        offset=-1,
        sourceHash="source-a",
        audioIdentity="audio-a",
        lines=[dict(text="Corrected", timestamp_s=10)],
    )
    values.update(updates)
    return StoredLyricsCorrection.model_validate(values)


def test_approved_overlay_keeps_originals_and_uses_defined_offset_sign() -> None:
    original = context()
    source_line = original.lines[0]
    approved = apply_overlay(
        context=original, proposals=[("request-a", proposal().model_dump_json())]
    )
    assert source_line.text == "Original" and source_line.timestamp_s == 10
    assert approved.lines[0].text == "Corrected"
    assert approved.offset == -1  # Timestamp 10 now aligns to playback second 11.
    assert approved.approved and approved.revision is not None


@pytest.mark.parametrize(
    "change", [dict(sourceHash="new-lrc"), dict(audioIdentity="new-audio"), dict(provider="Other")]
)
def test_replaced_sources_never_inherit_an_old_adjustment(change: dict[str, object]) -> None:
    data = apply_overlay(context=context(), proposals=[("r", proposal(**change).model_dump_json())])
    assert data.offset == 0 and data.lines[0].text == "Original"
    assert not data.approved


def test_latest_compatible_overlay_wins_and_changes_revision() -> None:
    old = proposal(offset=1).model_dump_json()
    new = proposal(offset=2).model_dump_json()
    a = apply_overlay(context=context(), proposals=[("old", old)])
    b = apply_overlay(context=context(), proposals=[("new", new), ("old", old)])
    assert b.offset == 2 and a.revision != b.revision


def test_no_audio_revision_disables_corrections_but_keeps_lyrics() -> None:
    source = context()
    source.audio_identity = None
    result = apply_overlay(context=source, proposals=[("r", proposal().model_dump_json())])
    assert result.lines[0].text == "Original" and result.revision is None


@pytest.mark.parametrize("offset", [float("nan"), float("inf"), -float("inf"), 121, -121])
def test_offsets_must_be_finite_and_bounded(offset: float) -> None:
    with pytest.raises(ValidationError):
        LyricsCorrection(provider="LRCLIB", revision="a" * 64, offset=offset)


@pytest.mark.parametrize(
    "lines",
    [
        [dict(text="Later", timestamp_s=20), dict(text="Earlier", timestamp_s=10)],
        [dict(text="Timed", timestamp_s=10), dict(text="Missing", timestamp_s=None)],
        [dict(text="Invalid", timestamp_s=float("nan"))],
        [dict(text="", timestamp_s=0)],
    ],
)
def test_invalid_line_edits_cannot_be_approved(lines: list[dict[str, object]]) -> None:
    with pytest.raises(ValidationError):
        proposal(lines=lines)


@pytest.mark.asyncio
@pytest.mark.parametrize("accepted,stale", [(True, False), (True, True), (False, True)])
async def test_review_validates_before_accepting_and_rejection_never_applies(
    monkeypatch: pytest.MonkeyPatch,
    accepted: bool,
    stale: bool,
) -> None:
    row = UserRequestRow(
        user_id=1,
        media_id=2,
        request_type_key=RequestTypeEnum.LYRICS.value,
        proposed_value=proposal().model_dump_json(),
        public_id="request",
        id=3,
    )
    checked: list[bool] = []
    updated: list[bool] = []

    async def get_request(session: AsyncSession, public_id: str) -> Result[UserRequestRow]:
        return Result(code=ResultCode.OK, message="OK", result=row)

    async def validate(session: AsyncSession, media_id: int, payload: str) -> Result[bool]:
        checked.append(True)
        if stale:
            return Result(code=ResultCode.BAD_REQUEST, message="Source changed")
        return Result(code=ResultCode.OK, message="OK", result=True)

    async def update(
        session: AsyncSession,
        request_id: int,
        status: RequestStatusEnum,
        reviewed_by: int,
        review_comment: str | None,
    ) -> Result[UserRequestRow]:
        updated.append(True)
        row.status_key = status.value
        return Result(code=ResultCode.OK, message="OK", result=row)

    async def mapped(session: AsyncSession, row: UserRequestRow) -> Result[UserRequestResponse]:
        response = UserRequestResponse(
            publicId="r",
            mediaPublicId="m",
            requestType=RequestTypeEnum.LYRICS,
            proposedValue=row.proposed_value,
            comment=None,
            status=RequestStatusEnum(row.status_key),
            reviewComment=None,
            dateAdded=datetime.now(UTC),
            userName=None,
            userImage=None,
        )
        return Result(code=ResultCode.OK, message="OK", result=response)

    monkeypatch.setattr(RequestAccess, "get_request_by_public_id_async", get_request)
    monkeypatch.setattr(RequestAccess, "update_request_status_async", update)
    monkeypatch.setattr(LyricsCorrections, "validate_review_async", validate)
    monkeypatch.setattr(userRequest, "_map_request_to_response", mapped)
    result = await userRequest.UserRequest.review_request_async(
        session=cast(AsyncSession, object()),
        public_id="request",
        reviewer_id=1,
        status=RequestStatusEnum.ACCEPTED if accepted else RequestStatusEnum.REJECTED,
    )
    assert bool(checked) == accepted
    assert result.is_ok() == (not accepted or not stale)
    assert bool(updated) == (not accepted or not stale)


@pytest.mark.asyncio
async def test_legacy_proposal_is_not_executed(monkeypatch: pytest.MonkeyPatch) -> None:
    result = await LyricsCorrections.validate_review_async(
        session=cast(AsyncSession, object()),
        media_id=1,
        payload='{"lyrics":"arbitrary text"}',
    )
    assert result.is_not_ok()
    assert result.code_str() == "BAD_REQUEST"


@pytest.mark.asyncio
async def test_terminal_review_cannot_be_reversed_or_applied_twice(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = UserRequestRow(
        user_id=1,
        media_id=2,
        request_type_key=RequestTypeEnum.LYRICS.value,
        proposed_value=proposal().model_dump_json(),
        public_id="request",
        id=3,
        status_key=RequestStatusEnum.ACCEPTED.value,
    )

    async def get_request(session: AsyncSession, public_id: str) -> Result[UserRequestRow]:
        return Result(code=ResultCode.OK, message="OK", result=row)

    monkeypatch.setattr(RequestAccess, "get_request_by_public_id_async", get_request)
    result = await userRequest.UserRequest.review_request_async(
        session=cast(AsyncSession, object()),
        public_id="request",
        reviewer_id=1,
        status=RequestStatusEnum.REJECTED,
    )
    assert result.is_not_ok() and result.code_str() == "BAD_REQUEST"


def test_shared_playback_clock_and_proposal_validation_in_node() -> None:
    """CI installs Node before backend tests; exercise the actual shared client helpers."""
    import subprocess
    from pathlib import Path

    root = Path(__file__).resolve().parents[4]
    result = subprocess.run(
        ["node", "--test", str(root / "apps/web/tests/lyricsTiming.test.mjs")],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
