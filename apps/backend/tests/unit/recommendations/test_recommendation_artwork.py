"""Artwork transport is authenticated, bounded, and independent of discovery."""

from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

import tests  # noqa: F401  # pyright: ignore[reportUnusedImport]
from core.controllers.recommendationController import router
from core.middlewares.authMiddleware import AuthMiddleware
from result import Result, ResultCode


def test_artwork_validates_metadata_and_returns_optional_cover() -> None:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[AuthMiddleware.auth_dependency] = lambda: None
    with (
        TestClient(app) as client,
        patch(
            "core.controllers.recommendationController.Recommendation.get_artwork_async",
            AsyncMock(
                return_value=Result[str](
                    code=ResultCode.OK, message="OK", result="https://covers.example/album.jpg"
                )
            ),
        ) as lookup,
    ):
        response = client.get(
            "/recommendation/artwork",
            params={"provider": "External", "artist": "Beyoncé", "track": "Déjà Vu"},
        )
        assert response.status_code == 200
        assert response.json() == {"imageUrl": "https://covers.example/album.jpg"}
        lookup.assert_awaited_once_with(provider_name="External", artist="Beyoncé", track="Déjà Vu")
        assert (
            client.get(
                "/recommendation/artwork",
                params={"provider": "External", "artist": "a" * 301, "track": "Song"},
            ).status_code
            == 422
        )
        assert lookup.await_count == 1
        lookup.return_value = Result[str](code=ResultCode.OK, message="No cover", result="")
        absent = client.get(
            "/recommendation/artwork",
            params={"provider": "External", "artist": "Artist", "track": "Song"},
        )
        assert absent.status_code == 200
        assert absent.json() == {"imageUrl": None}
        lookup.return_value = Result[str](code=ResultCode.GENERAL_ERROR, message="Timeout")
        unavailable = client.get(
            "/recommendation/artwork",
            params={"provider": "External", "artist": "Artist", "track": "Song"},
        )
        assert unavailable.status_code == 200
        assert unavailable.json() == {"imageUrl": None}


def test_artwork_endpoint_keeps_authentication_dependency() -> None:
    app = FastAPI()
    app.include_router(router)
    with (
        TestClient(app) as client,
        patch("core.middlewares.authMiddleware.DBSessionMiddleware.get_session", return_value=None),
        patch(
            "core.controllers.recommendationController.Recommendation.get_artwork_async",
            AsyncMock(),
        ) as lookup,
    ):
        response = client.get(
            "/recommendation/artwork",
            params={"provider": "External", "artist": "Artist", "track": "Song"},
        )
        assert response.status_code == 401
        lookup.assert_not_awaited()
