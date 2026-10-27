"""S3 object endpoints coexist with the existing local-media controllers."""

from app.main import app
from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession


def test_storage_listing_runs_access_query_without_external_storage() -> None:
    session = RecordingSession()
    response = DirectEndpointHarness(app, session).get("/storage-object")
    assert response.status_code == 200
    assert response.json() == []
    assert any("core.storage_object" in sql for sql in session.statements)


def test_missing_storage_object_returns_not_found() -> None:
    session = RecordingSession()
    response = DirectEndpointHarness(app, session).get("/storage-object/missing-object")
    assert response.status_code == 404
    assert response.json() == {"detail": "Storage object not found"}
    assert session.parameters[0]["public_id_1"] == "missing-object"


def test_missing_object_delete_returns_not_found_before_storage_call() -> None:
    from unittest.mock import AsyncMock, patch

    from core.framework.storage import Storage

    session = RecordingSession()
    with patch.object(Storage, "delete_object_async", new_callable=AsyncMock) as delete:
        response = DirectEndpointHarness(app, session).call("DELETE", "/storage-object/missing")
    assert response.status_code == 404
    delete.assert_not_awaited()
