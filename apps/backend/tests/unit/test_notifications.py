"""Notification endpoints derive ownership from authentication, never request data."""

from collections.abc import Awaitable, Callable
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, Request
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from core.aResult import AResult, AResultCode
from core.controllers.notificationController import router
from core.framework.notifications import Notifications
from core.middlewares.authMiddleware import AuthMiddleware

pytestmark = pytest.mark.unit


def application() -> FastAPI:
    app = FastAPI()
    app.include_router(router)

    async def session(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.db = AsyncMock(spec=AsyncSession)
        return await call_next(request)

    app.middleware("http")(session)
    return app


async def test_inbox_requires_authentication() -> None:
    app = application()
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        for path in (
            "/notifications",
            "/notifications/read",
            "/notifications/legacy",
            "/notifications/activity",
        ):
            response = await client.request(
                "GET" if path == "/notifications" else "POST", path, json={}
            )
            assert response.status_code == 401


async def test_read_request_uses_authenticated_user_and_validates_batch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = application()

    async def authenticated(request: Request) -> None:
        request.state.user = SimpleNamespace(id=7, lang_id=1)

    app.dependency_overrides[AuthMiddleware.auth_dependency] = authenticated
    mark = AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(Notifications, "mark_read_async", mark)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/notifications/read", json={"ids": ["public-id"], "user_id": 999}
        )
        assert response.status_code == 200
        assert mark.call_args.kwargs["user_id"] == 7
        assert mark.call_args.kwargs["public_ids"] == ["public-id"]
        invalid = await client.post("/notifications/read", json={"ids": ["id"] * 101})
        assert invalid.status_code == 422
        assert mark.await_count == 1
