"""Theme validation, authenticated ownership and persistence boundary coverage."""

from importlib import import_module
from typing import cast
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException, Request
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.migrations import MIGRATIONS, validate_migrations
from core.access.db.ormModels.user import UserRow
from core.access.userAccess import UserAccess
from core.requests.updateThemeRequest import UpdateThemeRequest
from core.responses.sessionResponse import SessionResponse
from result import Result, ResultCode

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("theme", ["dark", "light", "system"])
async def test_theme_access_updates_only_the_authenticated_row(theme: str) -> None:
    preference = UpdateThemeRequest.model_validate({"theme": theme}).theme
    owner = UserRow(username="owner", image_id=1)
    other = UserRow(username="other", image_id=1)
    session = AsyncMock(spec=AsyncSession)
    result = await UserAccess.update_theme_async(
        session=cast(AsyncSession, session), user=owner, theme=preference
    )
    assert result.is_ok()
    assert owner.theme == preference
    assert other.theme == "dark"
    session.flush.assert_awaited_once_with()


@pytest.mark.parametrize("theme", ["", "auto", "DARK", None, 1, True])
def test_theme_request_rejects_invalid_values(theme: object) -> None:
    with pytest.raises(ValidationError):
        UpdateThemeRequest.model_validate({"theme": theme})


def test_legacy_sessions_and_new_users_default_to_dark() -> None:
    user = UserRow(username="new", image_id=1)
    assert user.theme == "dark"
    assert UserRow.__table__.c.theme.nullable is False
    default = UserRow.__table__.c.theme.server_default
    assert default is not None
    assert str(default.arg) == "dark"
    session = SessionResponse.model_validate(
        {
            "username": "legacy",
            "image": "",
            "admin": False,
            "queueType": 2,
            "repeatMode": 1,
            "currentTimeMs": None,
        }
    )
    assert session.theme == "dark"
    assert session.model_dump()["theme"] == "dark"
    validate_migrations()
    migration = next(item for item in MIGRATIONS if item.name == "add_user_theme_preference")
    assert "DEFAULT 'dark'" in migration.statements[0]
    assert "CHECK (theme IN ('dark', 'light', 'system'))" in migration.statements[-1]


async def test_theme_controller_uses_the_authenticated_owner(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import_module("core.framework.websocket")
    userController = import_module("core.controllers.userController")
    owner = UserRow(username="owner", image_id=1)
    session = AsyncMock(spec=AsyncSession)
    save = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(
        userController.AuthMiddleware,
        "get_current_user",
        Mock(return_value=Result[UserRow](code=ResultCode.OK, message="OK", result=owner)),
    )
    monkeypatch.setattr(
        userController.DBSessionMiddleware, "get_session", Mock(return_value=session)
    )
    monkeypatch.setattr(userController.User, "update_theme_async", save)
    request = Request({"type": "http"})
    response = await userController.update_theme(
        request=request, payload=UpdateThemeRequest(theme="light")
    )
    assert response.status == "OK"
    save.assert_awaited_once_with(session=session, user=owner, theme="light")


async def test_theme_controller_propagates_auth_and_save_failures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import_module("core.framework.websocket")
    userController = import_module("core.controllers.userController")
    save = AsyncMock(return_value=Result(code=ResultCode.NOT_FOUND, message="Missing user"))
    monkeypatch.setattr(userController.User, "update_theme_async", save)
    monkeypatch.setattr(
        userController.AuthMiddleware,
        "get_current_user",
        Mock(return_value=Result[UserRow](code=ResultCode.BAD_REQUEST, message="Unauthorized")),
    )
    request = Request({"type": "http"})
    with pytest.raises(HTTPException) as error:
        await userController.update_theme(
            request=request, payload=UpdateThemeRequest(theme="system")
        )
    assert error.value.status_code == 400
    save.assert_not_awaited()
    owner = UserRow(username="owner", image_id=1)
    monkeypatch.setattr(
        userController.AuthMiddleware,
        "get_current_user",
        Mock(return_value=Result[UserRow](code=ResultCode.OK, message="OK", result=owner)),
    )
    monkeypatch.setattr(
        userController.DBSessionMiddleware,
        "get_session",
        Mock(return_value=AsyncMock(spec=AsyncSession)),
    )
    with pytest.raises(HTTPException) as error:
        await userController.update_theme(
            request=request, payload=UpdateThemeRequest(theme="system")
        )
    assert error.value.status_code == 404
