"""Conservative evidence, recording identity and reviewed-rating invariants."""

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.contentRatingAccess import ContentRatingAccess
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.userRequest import UserRequestRow
from core.access.mediaAccess import MediaAccess
from core.access.requestAccess import RequestAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.enums.requestStatusEnum import RequestStatusEnum
from core.enums.requestTypeEnum import RequestTypeEnum
from core.framework import providers
from core.framework.admin import userRequest
from core.framework.contentRating import ContentRatings
from core.responses.baseAlbumWithoutSongsResponse import BaseAlbumWithoutSongsResponse
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.songListResponse import SongListResponse
from core.responses.userRequestResponse import UserRequestResponse
from result import Result, ResultCode
from spotify.access.spotifyAccess import SpotifyAccess
from spotify.framework.provider.spotifyProvider import SpotifyProvider
from spotify.framework.spotifyCache import SpotifyCache
from youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess
from youtubeMusic.framework.provider.youtubeMusicProvider import YoutubeMusicProvider
from youtubeMusic.utils.youtubeMusicApi import YoutubeMusicApi


def ok(value: object) -> Result[object]:
    return Result(code=ResultCode.OK, message="OK", result=value)


def song(public_id: str) -> BaseSongWithAlbumResponse:
    return BaseSongWithAlbumResponse(
        provider="test",
        publicId=public_id,
        providerUrl="",
        name="Recording",
        artists=[],
        audioUrl=None,
        downloaded=True,
        imageUrl="",
        dominantColor="",
        duration_ms=200000,
        discNumber=1,
        trackNumber=1,
        album=BaseAlbumWithoutSongsResponse(
            provider="test",
            publicId="album",
            url="",
            providerUrl="",
            name="Album",
            artists=[],
            releaseDate="",
            imageUrl="",
            dominantColor="",
        ),
    )


@pytest.mark.parametrize("payload", ["[]", "null", "{", '{"explicit":false}', '{"explicit":"yes"}'])
def test_invalid_metadata_rating_is_rejected(payload: str) -> None:
    assert ContentRatings.parse_metadata_rating(payload=payload).code() == ResultCode.BAD_REQUEST


@pytest.mark.parametrize("value", ["explicit", "clean", "unknown"])
def test_three_states_are_preserved_in_review_payload(value: str) -> None:
    result = ContentRatings.parse_metadata_rating(payload='{"explicit":"' + value + '"}')
    assert result.is_ok()
    rating = result.result()
    assert len(rating) == 1 and rating[0].value == value
    unchanged = ContentRatings.parse_metadata_rating(payload='{"title":"New title"}')
    assert unchanged.is_ok() and unchanged.result() == []


async def test_nested_response_uses_one_local_query_and_never_guesses_clean(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    first, duplicate, missing = song("one"), song("one"), song("missing")
    ratings = AsyncMock(
        return_value=ok({"one": SimpleNamespace(is_explicit=True, explicit_source="review")})
    )
    monkeypatch.setattr(ContentRatingAccess, "get_batch_async", ratings)
    result = await ContentRatings.enrich_async(
        session=cast(AsyncSession, object()),
        response=SongListResponse(songs=[first, duplicate, missing]),
    )
    assert result.is_ok()
    assert [item.explicit for item in result.result().songs] == [True, True, None]
    ratings.assert_awaited_once()
    assert ratings.call_args.kwargs["public_ids"] == ["one", "missing"]


@pytest.mark.parametrize("batch", [False, True])
async def test_automatic_sql_preserves_manual_review_and_unknown_cannot_clear_known(
    batch: bool,
) -> None:
    session = AsyncMock(spec=AsyncSession)
    if batch:
        result = await ContentRatingAccess.record_batch_async(
            session=session, evidence=[(12, None, "catalog"), (13, True, "catalog")]
        )
    else:
        result = await ContentRatingAccess.record_async(
            session=session, media_id=12, is_explicit=None, source="catalog", is_manual=False
        )
    assert result.is_ok()
    session.execute.assert_awaited_once()
    statement = session.execute.call_args.args[0]
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "explicit_manual IS false" in sql
    assert "is_explicit IS NULL" in sql
    assert "media_type_key" in sql
    assert "core.media.id =" in sql


async def test_manual_unknown_can_clear_an_automatic_rating() -> None:
    session = AsyncMock(spec=AsyncSession)
    result = await ContentRatingAccess.record_async(
        session=session, media_id=12, is_explicit=None, source="manual:review", is_manual=True
    )
    assert result.is_ok()
    statement = session.execute.call_args.args[0]
    sql = str(statement.compile(dialect=postgresql.dialect()))
    assert "explicit_manual IS false" not in sql
    assert statement.compile().params["is_explicit"] is None
    assert statement.compile().params["explicit_manual"] is True


async def test_spotify_cached_exact_identity_does_not_treat_false_as_confirmed_clean(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        SpotifyAccess,
        "get_tracks_spotify_id_from_public_ids_async",
        AsyncMock(return_value=ok({"original": "A", "clean-edit": "B", "unavailable": "C"})),
    )
    cached = AsyncMock(
        return_value=ok(
            [SimpleNamespace(id="A", explicit=True), SimpleNamespace(id="B", explicit=False)]
        )
    )
    monkeypatch.setattr(SpotifyCache, "get_tracks_async", cached)
    result = await SpotifyProvider().get_content_rating_evidence_async(
        session=cast(AsyncSession, object()), public_ids=["original", "clean-edit", "unavailable"]
    )
    assert result.is_ok()
    assert result.result() == {"original": True, "clean-edit": None, "unavailable": None}
    cached.assert_awaited_once()


async def test_youtube_album_evidence_does_not_cross_recordings_or_versions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tracks = [
        SimpleNamespace(
            youtube_id=external,
            album=SimpleNamespace(youtube_id="album"),
            core_song=SimpleNamespace(public_id=public, is_explicit=None),
        )
        for public, external in [("studio", "A"), ("live", "B")]
    ]
    monkeypatch.setattr(
        YoutubeMusicAccess, "get_tracks_by_public_ids_async", AsyncMock(return_value=ok(tracks))
    )
    remote = AsyncMock(
        return_value=ok(
            [
                SimpleNamespace(youtube_id="A", explicit=True),
                SimpleNamespace(youtube_id="unrelated", explicit=True),
            ]
        )
    )
    monkeypatch.setattr(YoutubeMusicApi, "get_album_tracks_async", remote)
    result = await YoutubeMusicProvider().get_content_rating_evidence_async(
        session=cast(AsyncSession, object()), public_ids=["studio", "live"]
    )
    assert result.is_ok() and result.result() == {"studio": None, "live": None}
    remote.assert_not_awaited()
    result = await YoutubeMusicProvider().get_content_rating_evidence_async(
        session=cast(AsyncSession, object()), public_ids=["studio", "live"], allow_remote=True
    )
    assert result.is_ok() and result.result() == {"studio": True, "live": None}
    remote.assert_awaited_once_with(youtube_id="album")


async def test_download_optional_source_outage_remains_unknown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = CoreMediaRow(
        provider_id=8, media_type_key=MediaTypeEnum.SONG.value, public_id="song", id=5
    )
    monkeypatch.setattr(
        MediaAccess, "get_media_from_public_id_async", AsyncMock(return_value=ok(row))
    )
    provider = SimpleNamespace(
        get_content_rating_evidence_async=AsyncMock(
            return_value=Result(code=ResultCode.GENERAL_ERROR, message="unavailable")
        )
    )

    def find_provider(_: int) -> SimpleNamespace:
        return provider

    monkeypatch.setattr(providers, "find_media_provider", find_provider)
    write = AsyncMock(return_value=ResultCode(code=ResultCode.OK, message="OK"))
    monkeypatch.setattr(ContentRatingAccess, "record_batch_async", write)
    result = await ContentRatings.ingest_download_async(
        session=cast(AsyncSession, object()), public_id="song"
    )
    assert result.is_ok()
    assert write.call_args.kwargs["evidence"][0][1] is None


@pytest.mark.parametrize(
    "accepted,value,expected",
    [
        (True, "explicit", True),
        (True, "clean", False),
        (True, "unknown", None),
        (False, "explicit", None),
    ],
)
async def test_only_an_accepted_metadata_review_applies_manual_rating(
    monkeypatch: pytest.MonkeyPatch, accepted: bool, value: str, expected: bool | None
) -> None:
    row = UserRequestRow(
        user_id=1,
        media_id=2,
        request_type_key=RequestTypeEnum.METADATA.value,
        proposed_value='{"explicit":"' + value + '"}',
        public_id="request",
        id=3,
    )
    row.status_key = RequestStatusEnum.PENDING.value
    monkeypatch.setattr(
        RequestAccess, "get_request_by_public_id_async", AsyncMock(return_value=ok(row))
    )
    monkeypatch.setattr(
        RequestAccess, "get_media_public_id_from_id_async", AsyncMock(return_value=ok("song"))
    )
    monkeypatch.setattr(
        RequestAccess, "update_request_status_async", AsyncMock(return_value=ok(row))
    )
    response = UserRequestResponse(
        publicId="r",
        mediaPublicId="song",
        requestType=RequestTypeEnum.METADATA,
        proposedValue=row.proposed_value,
        comment=None,
        status=RequestStatusEnum.ACCEPTED,
        reviewComment=None,
        dateAdded=datetime.now(UTC),
        userName=None,
        userImage=None,
    )
    monkeypatch.setattr(
        userRequest, "_map_request_to_response", AsyncMock(return_value=ok(response))
    )
    apply = AsyncMock(return_value=ResultCode(code=ResultCode.OK, message="OK"))
    monkeypatch.setattr(ContentRatings, "record_async", apply)
    session = cast(AsyncSession, object())
    result = await userRequest.UserRequest.review_request_async(
        session=session,
        public_id="request",
        reviewer_id=1,
        status=RequestStatusEnum.ACCEPTED if accepted else RequestStatusEnum.REJECTED,
    )
    assert result.is_ok()
    if accepted:
        apply.assert_awaited_once_with(
            session=session, public_id="song", value=expected, source="manual:review", manual=True
        )
    else:
        apply.assert_not_awaited()


async def test_backfill_is_bounded_skips_manual_and_undownloaded_and_defaults_to_local(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rows = [
        CoreMediaRow(
            provider_id=8,
            media_type_key=MediaTypeEnum.SONG.value,
            public_id=f"song-{index}",
            id=index,
            explicit_manual=index == 1,
        )
        for index in range(1, 5)
    ]
    page = AsyncMock(return_value=ok(rows))
    monkeypatch.setattr(ContentRatingAccess, "page_songs_async", page)
    monkeypatch.setattr(
        ContentRatingAccess,
        "get_batch_async",
        AsyncMock(return_value=ok({row.public_id: row for row in rows})),
    )
    local_songs = [song("song-2"), song("song-3")]
    local_songs[1].downloaded = False
    provider = SimpleNamespace(
        get_local_songs_async=AsyncMock(return_value=ok(local_songs)),
        get_content_rating_evidence_async=AsyncMock(return_value=ok({"song-2": True})),
    )

    def find_provider(_: int) -> SimpleNamespace:
        return provider

    monkeypatch.setattr(providers, "find_media_provider", find_provider)
    write = AsyncMock(return_value=ResultCode(code=ResultCode.OK, message="OK"))
    monkeypatch.setattr(ContentRatingAccess, "record_batch_async", write)
    session = cast(AsyncSession, object())
    result = await ContentRatings.backfill_async(session=session, after="previous", limit=3)
    assert result.is_ok()
    assert result.result().nextAfter == "song-3" and result.result().hasMore
    assert result.result().examined == 3 and result.result().processed == 1
    page.assert_awaited_once_with(session=session, after="previous", limit=4)
    provider.get_local_songs_async.assert_awaited_once_with(
        session=session, public_ids=["song-2", "song-3"]
    )
    provider.get_content_rating_evidence_async.assert_awaited_once_with(
        session=session, public_ids=["song-2"], allow_remote=False
    )
    assert write.call_args.kwargs["evidence"] == [(2, True, "provider:8:catalog")]


async def test_download_does_not_reclassify_reviewed_unknown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    row = CoreMediaRow(
        provider_id=8,
        media_type_key=MediaTypeEnum.SONG.value,
        public_id="song",
        id=5,
        explicit_manual=True,
    )
    monkeypatch.setattr(
        MediaAccess, "get_media_from_public_id_async", AsyncMock(return_value=ok(row))
    )
    write = AsyncMock()
    monkeypatch.setattr(ContentRatingAccess, "record_batch_async", write)
    result = await ContentRatings.ingest_download_async(
        session=cast(AsyncSession, object()), public_id="song"
    )
    assert result.is_ok()
    write.assert_not_awaited()
