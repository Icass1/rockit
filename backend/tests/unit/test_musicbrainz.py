"""Metadata identity validation and provider/Core boundaries, without network IO."""

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.framework import providers
from backend.core.framework.metadata.metadata import Metadata
from backend.core.responses.metadataResponse import MetadataResponse
from backend.musicBrainz.framework.musicBrainzApi import MusicBrainzApi, retry_delay
from backend.musicBrainz.framework.provider.musicBrainzProvider import (
    MusicBrainzProvider,
)

pytestmark = pytest.mark.unit
MBID = "a16d1433-ba89-4f72-a47b-a370add0bb56"


def test_retry_after_supports_seconds_and_dates() -> None:
    assert retry_delay("120") == 120
    assert retry_delay("bad") == 60
    assert retry_delay("0") == 60
    future = format_datetime(datetime.now(timezone.utc) + timedelta(seconds=180))
    assert 178 < retry_delay(future) <= 180


async def test_invalid_identity_never_reaches_network(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fetch = AsyncMock()
    monkeypatch.setattr(MusicBrainzApi, "fetch_async", fetch)
    provider = MusicBrainzProvider()
    session = Mock(spec=AsyncSession)
    for entity, external_id in [("artist", "not-an-id"), ("unknown", MBID)]:
        result = await provider.get_metadata_async(
            session=session, entity=entity, external_id=external_id
        )
        assert result.is_not_ok()
        assert result.code() == AResultCode.BAD_REQUEST
    fetch.assert_not_awaited()


async def test_artist_search_keeps_candidates_and_escapes_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fetch = AsyncMock(
        return_value=AResult(
            code=AResultCode.OK,
            message="OK",
            result=MetadataResponse(
                provider="MusicBrainz",
                entity="artist-search",
                data={},
                cached=False,
                fetchedAt="2026-01-01T00:00:00Z",
            ),
        )
    )
    monkeypatch.setattr(MusicBrainzApi, "fetch_async", fetch)
    result = await MusicBrainzProvider().search_artists_async(
        session=Mock(spec=AsyncSession), name='  AC/dc   "Alias"  '
    )
    assert result.is_ok()
    query = fetch.call_args.kwargs["params"]["query"]
    assert 'ac\\/dc \\"alias\\"' in query
    assert fetch.call_args.kwargs["entity"] == "artist-search"


async def test_core_dispatches_only_to_metadata_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = MusicBrainzProvider()
    source.set_info(provider_id=900, provider_name="MusicBrainz")
    payload = MetadataResponse(
        provider="MusicBrainz",
        entity="artist",
        data={"id": MBID},
        cached=True,
        fetchedAt="2026-01-01T00:00:00Z",
    )
    fetch = AsyncMock(
        return_value=AResult(code=AResultCode.OK, message="OK", result=payload)
    )
    monkeypatch.setattr(source, "get_metadata_async", fetch)
    monkeypatch.setattr(providers, "_providers", [source])
    assert providers.get_media_providers() == []
    result = await Metadata.get_async(
        session=Mock(spec=AsyncSession),
        provider="musicbrainz",
        entity="artist",
        external_id=MBID,
        offset=0,
        limit=100,
        refresh=False,
    )
    assert result.is_ok()
    assert result.result() == payload
    fetch.assert_awaited_once()


async def test_artist_presentations_keep_provider_json_and_pagination(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The provider projects display data without changing its durable source payload."""
    source = {
        "release-groups": [
            {
                "id": MBID,
                "title": "Album",
                "first-release-date": "2025-05",
                "primary-type": "Album",
            }
        ],
        "release-group-count": 240,
        "release-group-offset": 100,
    }
    payload = MetadataResponse(
        provider="MusicBrainz",
        entity="discography",
        data=source,
        cached=True,
        fetchedAt="2026-01-01T00:00:00Z",
        stale=True,
    )
    fetch = AsyncMock(
        return_value=AResult(code=AResultCode.OK, message="OK", result=payload)
    )
    monkeypatch.setattr(MusicBrainzApi, "fetch_async", fetch)
    result = await MusicBrainzProvider().get_metadata_async(
        session=Mock(spec=AsyncSession),
        entity="artist-discography",
        external_id=MBID,
        offset=100,
    )
    assert result.is_ok()
    projected = result.result()
    assert projected.data == {
        "items": [{"id": MBID, "title": "Album", "date": "2025-05", "kind": "Album"}],
        "total": 240,
        "offset": 100,
    }
    assert projected.stale and projected.cached
    assert payload.data == source
    assert fetch.call_args.kwargs["params"]["offset"] == 100


async def test_artist_profile_projects_members_and_events_with_nullable_area(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A missing artist area is normal; membership and event relations remain distinct."""
    payload = MetadataResponse(
        provider="MusicBrainz",
        entity="artist",
        data={
            "name": "Band",
            "area": None,
            "life-span": {"begin": "2009"},
            "genres": [{"name": "rock", "count": 5}],
            "relations": [
                {
                    "type": "member of band",
                    "artist": {"id": MBID, "name": "Solo Artist"},
                },
                {
                    "type": "main performer",
                    "begin": "2025-05-10",
                    "event": {
                        "id": MBID,
                        "name": "Concert",
                        "life-span": {"begin": "2025-05-11"},
                    },
                },
            ],
        },
        cached=False,
        fetchedAt="2026-01-01T00:00:00Z",
    )
    fetch = AsyncMock(
        return_value=AResult(code=AResultCode.OK, message="OK", result=payload)
    )
    monkeypatch.setattr(MusicBrainzApi, "fetch_async", fetch)
    result = await MusicBrainzProvider().get_metadata_async(
        session=Mock(spec=AsyncSession), entity="artist-profile", external_id=MBID
    )
    assert result.is_ok()
    data = result.result().data
    assert data["description"] == "2009"
    assert data["genres"] == ["rock"]
    assert data["related"][0]["name"] == "Solo Artist"
    assert data["events"][0]["date"] == "2025-05-11"
    assert "event-rels" in fetch.call_args.kwargs["params"]["inc"]
