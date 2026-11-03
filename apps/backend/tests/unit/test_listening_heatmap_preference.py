from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.user import UserRow
from core.access.userAccess import UserAccess
from core.requests.updateListeningHeatmapRequest import UpdateListeningHeatmapRequest


@pytest.mark.parametrize("enabled", [True, False])
async def test_visibility_is_saved_for_requested_user(enabled: bool) -> None:
    user = SimpleNamespace(show_listening_heatmap=not enabled)
    session = AsyncMock(spec=AsyncSession)
    session.get.return_value = user
    result = await UserAccess.update_user_listening_heatmap_async(
        session=cast(AsyncSession, session), user_id=7, enabled=enabled
    )
    assert result.is_ok(), result.info()
    assert user.show_listening_heatmap is enabled
    session.get.assert_awaited_once_with(entity=UserRow, ident=7)
    session.commit.assert_awaited_once()


async def test_missing_user_does_not_commit() -> None:
    session = AsyncMock(spec=AsyncSession)
    session.get.return_value = None
    result = await UserAccess.update_user_listening_heatmap_async(
        session=cast(AsyncSession, session), user_id=7, enabled=False
    )
    assert result.is_not_ok()
    session.commit.assert_not_awaited()


@pytest.mark.parametrize("enabled", ["false", 0, None])
def test_visibility_requires_boolean(enabled: object) -> None:
    with pytest.raises(ValidationError):
        UpdateListeningHeatmapRequest(enabled=enabled)
