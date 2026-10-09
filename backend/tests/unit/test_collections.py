from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.media.collection import Collection
from backend.core.access.collectionAccess import CollectionAccess
from backend.core.framework.models.collection import CollectionRecord

pytestmark = pytest.mark.unit


async def test_access_failure_is_propagated_without_loading_items(monkeypatch):
    failure = AResult(code=AResultCode.GENERAL_ERROR, message="Unavailable")
    monkeypatch.setattr(
        CollectionAccess, "records_async", AsyncMock(return_value=failure)
    )
    entries = AsyncMock()
    monkeypatch.setattr(CollectionAccess, "entries_async", entries)
    result = await Collection.page_async(
        session=SimpleNamespace(), public_id="list", user_id=1
    )
    assert result.is_not_ok() and result.message() == "Unavailable"
    entries.assert_not_awaited()


async def test_empty_queue_does_not_replace_existing_queue(monkeypatch):
    root = CollectionRecord(
        id=1, public_id="list", provider_id=1, media_type_key=3, name="List"
    )
    monkeypatch.setattr(
        CollectionAccess,
        "records_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=[root])
        ),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "entries_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.OK, message="OK", result=([], 0))
        ),
    )
    monkeypatch.setattr(
        CollectionAccess,
        "public_ids_async",
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result={})),
    )
    save = AsyncMock()
    monkeypatch.setattr(CollectionAccess, "save_queue_async", save)
    result = await Collection.queue_async(
        session=SimpleNamespace(), public_id="list", user_id=1
    )
    assert result.code() == AResultCode.BAD_REQUEST
    save.assert_not_awaited()
