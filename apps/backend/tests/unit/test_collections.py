from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.collectionAccess import CollectionAccess
from core.aResult import AResult, AResultCode
from core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from core.framework.media.collection import Collection
from core.framework.models.collection import CollectionEntry, CollectionRecord

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
    failure: AResult[list[CollectionRecord]] = AResult(
        code=AResultCode.GENERAL_ERROR, message="Unavailable"
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
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result=[root])),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "entries_async",
        AsyncMock(
            return_value=AResult[tuple[list[CollectionEntry], int]](
                code=AResultCode.OK, message="OK", result=([], 0)
            )
        ),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "public_ids_async",
        AsyncMock(
            return_value=AResult[dict[int, str]](code=AResultCode.OK, message="OK", result={})
        ),
    )
    save = AsyncMock()
    monkeypatch.setattr(CollectionAccess, "save_queue_async", save)
    result = await Collection.queue_async(
        session=AsyncMock(spec=AsyncSession), public_id="list", user_id=1
    )
    assert result.code() == AResultCode.BAD_REQUEST
    save.assert_not_awaited()
