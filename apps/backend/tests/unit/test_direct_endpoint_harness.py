"""Tests for endpoint calls through FastAPI's registered route metadata without HTTP."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from pydantic import BaseModel, Field

from tests.direct_harness import DirectEndpointHarness  # noqa: E402
from tests.fakes import RecordingSession  # noqa: E402

BACKEND_ROOT = Path(__file__).parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class Payload(BaseModel):
    """Example request body used to verify JSON model parsing."""

    label: str = Field(min_length=1)
    quantity: int = Field(gt=0)


def test_registered_endpoint_receives_parsed_json_and_query_values() -> None:
    """The direct harness applies Pydantic body/query validation before invocation."""
    app = FastAPI()
    invoked = AsyncMock(return_value={"ok": True})

    @app.post("/example/{item_id}")
    async def endpoint(item_id: int, payload: Payload, limit: int = Query(5)) -> object:
        return await invoked(item_id, payload, limit)

    harness = DirectEndpointHarness(app, RecordingSession())
    response = harness.call(
        "POST",
        "/example/12?limit=3",
        json={"label": "box", "quantity": 2},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    invoked.assert_awaited_once()
    assert invoked.await_args is not None
    args = invoked.await_args.args
    assert args[0] == 12
    assert args[1] == Payload(label="box", quantity=2)
    assert args[2] == 3


def test_registered_endpoint_returns_validation_response_without_calling_endpoint() -> None:
    """Invalid JSON data is rejected before the endpoint body executes."""
    app = FastAPI()
    invoked = AsyncMock(return_value={"userId": 1})

    @app.post("/example")
    async def endpoint(payload: Payload) -> object:
        return await invoked(payload)

    response = DirectEndpointHarness(app, RecordingSession()).post(
        "/example", json={"label": "", "quantity": 0}
    )

    assert response.status_code == 422
    assert len(response.json()["detail"]) == 2
    invoked.assert_not_awaited()


def test_registered_endpoint_applies_auth_dependency_and_maps_http_errors() -> None:
    """Registered auth dependency behavior and controller HTTP errors are observable."""
    app = FastAPI()
    invoked = AsyncMock(return_value={"userId": 1})

    async def auth_dependency() -> None:
        return None

    @app.get("/private")
    async def endpoint(request: Request, _: None = Depends(auth_dependency)) -> object:
        return await invoked(request.state.user.id)

    harness = DirectEndpointHarness(app, RecordingSession())
    with patch("core.middlewares.authMiddleware.AuthMiddleware.auth_dependency", auth_dependency):
        response = harness.get("/private")

    assert response.status_code == 200
    invoked.assert_awaited_once_with(1)

    @app.get("/failure")
    async def failure() -> None:
        raise HTTPException(status_code=409, detail="conflict")

    error_response = harness.get("/failure")
    assert error_response.status_code == 409
    assert error_response.json() == {"detail": "conflict"}


def test_recording_session_exposes_compiled_postgresql_and_configured_result() -> None:
    """Database tests inspect generated SQL while result rows stay explicitly controlled."""
    from sqlalchemy import select

    from core.access.db.ormModels.user import UserRow

    session = RecordingSession(results=[["user-public-id"]])
    result = asyncio.run(
        session.execute(select(UserRow.public_id).where(UserRow.public_id == "user-public-id"))
    )

    assert result.scalar_one() == "user-public-id"
    assert 'FROM core."user"' in session.statements[0]
    assert session.parameters[0]["public_id_1"] == "user-public-id"
