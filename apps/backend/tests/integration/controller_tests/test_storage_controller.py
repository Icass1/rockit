"""Storage metadata remains available internally after removing its HTTP endpoints."""

from typing import cast

from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from core.framework.storage import Storage
from result import ResultCode
from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession


async def test_storage_listing_runs_access_query_without_external_storage() -> None:
    session = RecordingSession()
    result = await Storage.get_all_objects_async(session=cast(AsyncSession, session))
    assert result.is_ok()
    assert result.result() == []
    assert any("core.storage_object" in sql for sql in session.statements)


async def test_missing_storage_object_returns_not_found() -> None:
    session = RecordingSession()
    result = await Storage.get_object_from_public_id_async(
        session=cast(AsyncSession, session), public_id="missing-object"
    )
    assert result.is_not_ok()
    assert result.code() == ResultCode.NOT_FOUND
    assert result.message() == "Storage object not found"
    assert session.parameters[0]["public_id_1"] == "missing-object"


def test_storage_object_routes_are_removed() -> None:
    routes = DirectEndpointHarness(app, RecordingSession()).registered_routes()
    assert not any(
        route.path == "/storage-object" or route.path.startswith("/storage-object/")
        for route in routes
    )
