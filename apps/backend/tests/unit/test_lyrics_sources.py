"""Source IDs are suggestions until review, and snapshots never overwrite provider rows."""

from datetime import UTC, datetime
from typing import cast
from unittest.mock import AsyncMock

import httpx
import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.userRequest import UserRequestRow
from core.access.requestAccess import RequestAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.enums.requestTypeEnum import RequestTypeEnum
from core.framework import providers
from core.framework.lyricsCorrections import LyricsCorrections
from core.framework.lyricsSources import LyricsSources
from core.models.lyricsCorrection import LyricsCorrectionLine
from core.models.lyricsSource import LyricsSource, StoredLyricsSource
from core.responses.userRequestResponse import UserRequestResponse
from lrclib.framework.provider.lrclibProvider import LrclibProvider
from result import Result, ResultCode


def snapshot() -> StoredLyricsSource:
    return StoredLyricsSource(
        kind="lyrics_source",
        provider="LRCLIB",
        sourceId=123,
        trackName="Song",
        artistName="Artist",
        duration=120,
        lines=[LyricsCorrectionLine(text="Reviewed words", timestamp_s=2)],
    )


def media() -> CoreMediaRow:
    return CoreMediaRow(
        provider_id=1, media_type_key=MediaTypeEnum.SONG.value, public_id="song", id=7
    )


@pytest.mark.parametrize("source_id", [0, -1, True, 1.5, "123", 9007199254740992])
def test_source_ids_are_strict_positive_safe_integers(source_id: object) -> None:
    with pytest.raises(ValidationError):
        LyricsSource.model_validate(
            dict(kind="lyrics_source", provider="LRCLIB", sourceId=source_id)
        )


@pytest.mark.asyncio
async def test_prepare_resolves_readonly_snapshot_and_rejects_client_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = LrclibProvider()
    provider.set_info(provider_id=1, provider_name="LRCLIB")
    lookup = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=snapshot()))
    monkeypatch.setattr(provider, "get_lyrics_source_async", lookup)
    monkeypatch.setattr(providers, "get_lyrics_providers", lambda: [provider])
    monkeypatch.setattr(
        RequestAccess,
        "lock_media_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=media())),
    )
    session = cast(AsyncSession, object())
    result = await LyricsSources.prepare_async(
        session=session,
        media_id=7,
        payload=LyricsSource(
            kind="lyrics_source", provider="LRCLIB", sourceId=123
        ).model_dump_json(),
    )
    assert result.is_ok()
    assert StoredLyricsSource.model_validate_json(result.result()).lines[0].text == "Reviewed words"
    forged = await LyricsSources.prepare_async(
        session=session, media_id=7, payload=snapshot().model_dump_json()
    )
    assert forged.code() == ResultCode.BAD_REQUEST
    assert lookup.await_count == 1


@pytest.mark.asyncio
async def test_only_accepted_source_snapshot_changes_player(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    provider = LrclibProvider()
    provider.set_info(provider_id=1, provider_name="LRCLIB")
    automatic = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result={}))
    monkeypatch.setattr(provider, "get_lyrics_bundle_async", automatic)
    monkeypatch.setattr(providers, "get_lyrics_providers", lambda: [provider])

    def no_local_provider(provider_id: int) -> None:
        return None

    monkeypatch.setattr(providers, "find_local_media_provider", no_local_provider)
    accepted: list[UserRequestRow] = []

    async def requests(session: AsyncSession, media_id: int) -> Result[list[UserRequestRow]]:
        return Result(code=ResultCode.OK, message="OK", result=accepted)

    monkeypatch.setattr(RequestAccess, "get_accepted_lyrics_async", requests)
    session = cast(AsyncSession, object())
    before = await LyricsCorrections.context_async(session=session, media=media())
    assert before.is_ok() and not before.result().lines
    accepted.append(
        UserRequestRow(
            user_id=1,
            media_id=7,
            request_type_key=RequestTypeEnum.LYRICS.value,
            proposed_value=snapshot().model_dump_json(),
            public_id="approved",
            status_key=2,
        )
    )
    after = await LyricsCorrections.context_async(session=session, media=media())
    assert after.is_ok() and after.result().approved
    assert after.result().public_id == "123"
    assert after.result().lines[0].text == "Reviewed words"
    assert automatic.await_count == 1  # Approved text does not trigger another automatic match.


@pytest.mark.asyncio
async def test_source_lookup_uses_exact_id_and_does_not_save_lyrics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requested: list[str] = []

    async def get(self: httpx.AsyncClient, *, url: str) -> httpx.Response:
        requested.append(url)
        return httpx.Response(
            200,
            request=httpx.Request("GET", url),
            json={
                "id": 123,
                "trackName": "Song",
                "artistName": "Artist",
                "duration": 120,
                "syncedLyrics": "[00:02.00]Words",
                "plainLyrics": "Words",
            },
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    result = await LrclibProvider().get_lyrics_source_async(source_id=123)
    assert result.is_ok() and result.result().lines[0].timestamp_s == 2
    assert requested == ["https://lrclib.net/api/get/123"]


@pytest.mark.asyncio
@pytest.mark.parametrize("accept", [True, False])
async def test_admin_review_routes_source_snapshots_without_applying_on_rejection(
    monkeypatch: pytest.MonkeyPatch, accept: bool
) -> None:
    from core.enums.requestStatusEnum import RequestStatusEnum
    from core.framework.admin import userRequest

    row = UserRequestRow(
        user_id=1,
        media_id=7,
        request_type_key=RequestTypeEnum.LYRICS.value,
        proposed_value=snapshot().model_dump_json(),
        public_id="request",
        id=1,
    )
    check = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    update = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=row))
    monkeypatch.setattr(
        RequestAccess,
        "get_request_by_public_id_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=row)),
    )
    monkeypatch.setattr(RequestAccess, "update_request_status_async", update)
    monkeypatch.setattr(LyricsSources, "validate_review_async", check)
    monkeypatch.setattr(
        LyricsCorrections,
        "validate_review_async",
        AsyncMock(side_effect=AssertionError("Source suggestion treated as a timing correction")),
    )
    monkeypatch.setattr(
        userRequest,
        "_map_request_to_response",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=UserRequestResponse(
                    publicId="request",
                    mediaPublicId="song",
                    requestType=RequestTypeEnum.LYRICS,
                    proposedValue=row.proposed_value,
                    status=RequestStatusEnum.PENDING,
                    dateAdded=datetime.now(UTC),
                ),
            )
        ),
    )
    result = await userRequest.UserRequest.review_request_async(
        session=cast(AsyncSession, object()),
        public_id="request",
        reviewer_id=2,
        status=RequestStatusEnum.ACCEPTED if accept else RequestStatusEnum.REJECTED,
    )
    assert result.is_ok()
    assert check.await_count == int(accept)
    assert update.await_count == 1
    if not accept:
        assert update.await_args is not None
        discarded = LyricsSource.model_validate_json(update.await_args.kwargs["proposed_value"])
        assert discarded.sourceId == 123
        assert "lines" not in update.await_args.kwargs["proposed_value"]


@pytest.mark.asyncio
async def test_provisional_source_is_private_then_removed_on_rejection(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from core.enums.requestStatusEnum import RequestStatusEnum

    provider = LrclibProvider()
    provider.set_info(provider_id=1, provider_name="LRCLIB")
    monkeypatch.setattr(providers, "get_lyrics_providers", lambda: [provider])
    monkeypatch.setattr(
        provider,
        "get_lyrics_bundle_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result={})),
    )

    def no_local_provider(provider_id: int) -> None:
        return None

    monkeypatch.setattr(providers, "find_local_media_provider", no_local_provider)
    approved = snapshot().model_copy(
        update={"lines": [LyricsCorrectionLine(text="Previous lyrics")]}
    )
    original = UserRequestRow(
        user_id=2,
        media_id=7,
        request_type_key=RequestTypeEnum.LYRICS.value,
        proposed_value=approved.model_dump_json(),
        public_id="approved",
        status_key=2,
    )
    pending = UserRequestRow(
        user_id=1,
        media_id=7,
        request_type_key=RequestTypeEnum.LYRICS.value,
        proposed_value=snapshot().model_dump_json(),
        public_id="pending",
        status_key=1,
    )
    monkeypatch.setattr(
        RequestAccess,
        "get_accepted_lyrics_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[original])),
    )

    async def proposals(
        session: AsyncSession, media_id: int, user_id: int
    ) -> Result[list[UserRequestRow]]:
        visible = [pending] if user_id == pending.user_id and pending.status_key == 1 else []
        return Result(code=ResultCode.OK, message="OK", result=visible)

    monkeypatch.setattr(RequestAccess, "get_pending_lyrics_async", proposals)
    session = cast(AsyncSession, object())
    own = await LyricsCorrections.context_async(session=session, media=media(), viewer_id=1)
    assert own.is_ok() and own.result().pending and not own.result().approved
    assert own.result().lines[0].text == "Reviewed words"
    other = await LyricsCorrections.context_async(session=session, media=media(), viewer_id=2)
    assert other.is_ok() and other.result().lines[0].text == "Previous lyrics"
    pending.status_key = RequestStatusEnum.REJECTED.value
    pending.proposed_value = LyricsSources.discard_text(payload=pending.proposed_value)
    restored = await LyricsCorrections.context_async(session=session, media=media(), viewer_id=1)
    assert restored.is_ok() and not restored.result().pending
    assert restored.result().lines[0].text == "Previous lyrics"


@pytest.mark.asyncio
async def test_pending_query_is_scoped_to_author_media_and_status() -> None:
    from unittest.mock import MagicMock

    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    execute = AsyncMock(return_value=result)
    session = MagicMock(spec=AsyncSession)
    session.execute = execute
    response = await RequestAccess.get_pending_lyrics_async(
        session=cast(AsyncSession, session), media_id=7, user_id=42
    )
    assert response.is_ok()
    assert execute.await_args is not None
    parameters = execute.await_args.args[0].compile().params
    assert parameters["media_id_1"] == 7
    assert parameters["user_id_1"] == 42
    assert parameters["status_key_1"] == 1
    assert parameters["request_type_key_1"] == RequestTypeEnum.LYRICS.value
