from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.user import UserRow
from core.access.userAccess import UserAccess
from core.requests.updateVolumeRequest import UpdateVolumeRequest


@pytest.mark.parametrize("volume", [-0.1, 1.1, float("nan"), float("inf")])
def test_volume_rejects_invalid_levels(volume: float) -> None:
    with pytest.raises(ValidationError):
        UpdateVolumeRequest(volume=volume)


@pytest.mark.parametrize("volume", [0.0, 0.37, 1.0])
async def test_volume_is_saved_for_the_requested_user(volume: float) -> None:
    user = SimpleNamespace(volume=1.0)
    session = AsyncMock(spec=AsyncSession)
    session.get.return_value = user
    result = await UserAccess.update_user_volume_async(
        session=cast(AsyncSession, session), user_id=7, volume=volume
    )
    assert result.is_ok(), result.info()
    assert user.volume == volume
    session.get.assert_awaited_once_with(entity=UserRow, ident=7)
    session.commit.assert_awaited_once()
