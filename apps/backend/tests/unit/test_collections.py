from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.collectionAccess import CollectionAccess
from core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from core.enums.queueTypeEnum import QueueTypeEnum
from core.framework.media.collection import Collection
from core.framework.models.collection import CollectionEntry, CollectionRecord
from core.responses.baseVideoResponse import BaseVideoResponse
from result import Result, ResultCode

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("role", list(PlaylistContributorRoleEnum))
async def test_nested_playlist_preserves_contributor_roles(
    role: PlaylistContributorRoleEnum,
) -> None:
    """Nested playlists retain typed roles and serialize them as role names."""
    record = CollectionRecord(
        id=2,
        public_id="nested-list",
        provider_id=1,
        media_type_key=3,
        name="Nested playlist",
        data=dict(
            owner="Owner",
            item_count=5,
            contributors=[dict(userPublicId="user", username="Contributor", role=role)],
        ),
    )

    result = await Collection.hydrate_async(session=AsyncMock(spec=AsyncSession), records=[record])

    assert result.is_ok()
    playlist = result.result()[record.public_id]
    assert playlist.owner == "Owner"
    assert playlist.itemCount == 5
    assert playlist.medias == []
    assert playlist.contributors[0].role is role
    assert playlist.model_dump(mode="json")["contributors"] == [
        dict(userPublicId="user", username="Contributor", role=role.name)
    ]


async def test_access_failure_is_propagated_without_loading_items(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    failure: Result[list[CollectionRecord]] = Result(
        code=ResultCode.GENERAL_ERROR, message="Unavailable"
    )
    monkeypatch.setattr(CollectionAccess, "records_async", AsyncMock(return_value=failure))
    entries = AsyncMock()
    monkeypatch.setattr(CollectionAccess, "entries_async", entries)
    result = await Collection.page_async(
        session=AsyncMock(spec=AsyncSession), public_id="list", user_id=1
    )
    assert result.is_not_ok() and result.message() == "Unavailable"
    entries.assert_not_awaited()


async def test_empty_queue_does_not_replace_existing_queue(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    root = CollectionRecord(id=1, public_id="list", provider_id=1, media_type_key=3, name="List")
    monkeypatch.setattr(
        CollectionAccess,
        "records_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[root])),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "entries_async",
        AsyncMock(
            return_value=Result[tuple[list[CollectionEntry], int]](
                code=ResultCode.OK, message="OK", result=([], 0)
            )
        ),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "public_ids_async",
        AsyncMock(return_value=Result[dict[int, str]](code=ResultCode.OK, message="OK", result={})),
    )
    save = AsyncMock()
    monkeypatch.setattr(CollectionAccess, "save_queue_async", save)
    result = await Collection.queue_async(
        session=AsyncMock(spec=AsyncSession), public_id="list", user_id=1
    )
    assert result.code() == ResultCode.BAD_REQUEST
    save.assert_not_awaited()


@pytest.mark.parametrize("queue_type", list(QueueTypeEnum))
@pytest.mark.parametrize("start_public_id", [None, "track-1"])
async def test_collection_queue_selects_and_persists_start_for_queue_mode(
    monkeypatch: pytest.MonkeyPatch,
    queue_type: QueueTypeEnum,
    start_public_id: str | None,
) -> None:
    """Shuffle the initial selection unless a particular track was requested."""
    root = CollectionRecord(id=1, public_id="list", provider_id=1, media_type_key=3, name="List")
    tracks = [
        CollectionRecord(
            id=i + 2, public_id=f"track-{i}", provider_id=1, media_type_key=5, name=f"Track {i}"
        )
        for i in range(3)
    ]
    monkeypatch.setattr(
        CollectionAccess,
        "records_async",
        AsyncMock(
            side_effect=[
                Result(code=ResultCode.OK, message="OK", result=[root]),
                Result(code=ResultCode.OK, message="OK", result=tracks),
            ]
        ),
    )
    entries = [
        CollectionEntry(
            parent_id=root.id, media_id=track.id, position=i, added_at=datetime.now(tz=UTC)
        )
        for i, track in enumerate(tracks)
    ]
    monkeypatch.setattr(
        CollectionAccess,
        "entries_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=(entries, 3))),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "public_ids_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result={track.id: track.public_id for track in tracks},
            )
        ),
    )
    monkeypatch.setattr(
        Collection,
        "hydrate_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result={
                    track.public_id: BaseVideoResponse(
                        provider="test",
                        publicId=track.public_id,
                        providerUrl="",
                        name=track.name,
                        imageUrl="",
                        dominantColor="",
                        duration_ms=1000,
                        artists=[],
                        downloaded=False,
                    )
                    for track in tracks
                },
            )
        ),
    )

    # Force a non-first track to lead the shuffle without relying on chance.
    def reverse_order(values: list[int]) -> None:
        values.reverse()

    monkeypatch.setattr("core.framework.media.collection.shuffle", reverse_order)
    session = AsyncMock(spec=AsyncSession)
    session.execute.return_value = MagicMock()
    session.execute.return_value.scalar_one.return_value = queue_type.value

    result = await Collection.queue_async(
        session=session, public_id="list", user_id=1, start_public_id=start_public_id
    )

    assert result.is_ok(), result.info()
    response = result.result()
    expected_start = 1 if start_public_id else (2 if queue_type is QueueTypeEnum.RANDOM else 0)
    assert response.queueType is queue_type
    assert response.currentQueueMediaId == expected_start
    selected = response.queue[expected_start]
    assert selected.media.publicId == f"track-{expected_start}"
    assert selected.sortedIndex == expected_start
    assert selected.randomIndex == (0 if start_public_id or expected_start == 2 else 2)
    assert sorted(item.randomIndex for item in response.queue) == [0, 1, 2]
    assert [item.sortedIndex for item in response.queue] == [0, 1, 2]
    persisted_update = session.execute.await_args_list[-1].args[0]
    assert persisted_update.compile().params["current_queue_id"] == expected_start
    inserted_rows = session.execute.await_args_list[2].args[1]
    assert inserted_rows[expected_start]["random_index"] == selected.randomIndex
    session.commit.assert_awaited_once()
