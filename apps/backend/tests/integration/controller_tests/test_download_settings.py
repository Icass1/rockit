"""Download preferences use the authenticated session and user settings routes."""

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.main import app
from core.framework.media.image import Image
from core.framework.user.user import User
from result import Result, ResultCode
from tests.direct_harness import DirectEndpointHarness
from tests.fakes import RecordingSession


@pytest.mark.parametrize("enabled", [True, False])
def test_session_includes_saved_download_preference(
    monkeypatch: pytest.MonkeyPatch, enabled: bool
) -> None:
    harness = DirectEndpointHarness(app, RecordingSession())
    harness.user = SimpleNamespace(
        id=7,
        username="listener",
        image=SimpleNamespace(id=1),
        admin=False,
        queue_type_key=2,
        repeat_mode_key=1,
        current_time_ms=None,
        volume=0.5,
        show_listening_heatmap=True,
        theme="dark",
        auto_add_downloads_to_library=enabled,
    )
    monkeypatch.setattr(
        Image,
        "get_internal_image_url_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result="image-url")),
    )

    response = harness.get("/user/session")

    assert response.status_code == 200
    assert response.json()["autoAddToLibrary"] is enabled
    assert response.json()["username"] == "listener"


@pytest.mark.parametrize("enabled", [True, False])
def test_download_preference_is_saved_for_the_authenticated_user(enabled: bool) -> None:
    session = RecordingSession()
    harness = DirectEndpointHarness(app, session)
    harness.user = SimpleNamespace(id=7, auto_add_downloads_to_library=not enabled)

    response = harness.post("/user/download-settings", json={"autoAddToLibrary": enabled})

    assert response.status_code == 200
    assert harness.user.auto_add_downloads_to_library is enabled


def test_failed_download_preference_save_returns_an_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        User,
        "update_download_settings_async",
        AsyncMock(return_value=Result(code=ResultCode.GENERAL_ERROR, message="Cannot save")),
    )
    response = DirectEndpointHarness(app, RecordingSession()).post(
        "/user/download-settings", json={"autoAddToLibrary": True}
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Cannot save"


@pytest.mark.parametrize("payload", [{}, {"autoAddToLibrary": "false"}, {"autoAddToLibrary": 0}])
def test_download_preference_requires_a_boolean(payload: dict[str, object]) -> None:
    harness = DirectEndpointHarness(app, RecordingSession())
    harness.user = SimpleNamespace(id=7, auto_add_downloads_to_library=True)

    response = harness.post("/user/download-settings", json=payload)

    assert response.status_code == 422
    assert harness.user.auto_add_downloads_to_library is True


def test_download_preferences_require_authentication() -> None:
    harness = DirectEndpointHarness(app, RecordingSession())
    harness.user = None
    assert harness.get("/user/session").status_code == 401
    assert (
        harness.post("/user/download-settings", json={"autoAddToLibrary": True}).status_code == 401
    )


@pytest.mark.parametrize("method", ["GET", "POST"])
def test_downloader_settings_route_is_removed(method: str) -> None:
    response = DirectEndpointHarness(app, RecordingSession()).call(
        method, "/downloader/settings", json={"autoAddToLibrary": True}
    )
    assert response.status_code == 404
