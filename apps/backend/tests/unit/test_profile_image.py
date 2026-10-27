"""Profile uploads retain validation and assign images through the new storage API."""

from io import BytesIO
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from PIL import Image as PillowImage
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.image import ImageRow
from core.access.userAccess import UserAccess
from core.framework.media.image import Image
from core.framework.user.profileImage import upload_profile_image_async
from result import Result, ResultCode


async def test_profile_upload_uses_storage_and_assigns_the_created_image(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = BytesIO()
    PillowImage.new("RGB", (20, 10), "red").save(source, format="PNG")
    session = cast(AsyncSession, object())
    image = cast(ImageRow, SimpleNamespace(id=42))
    create = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=image))
    assign = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    monkeypatch.setattr(UserAccess, "update_user_image_async", assign)

    result = await upload_profile_image_async(session=session, user_id=7, data=source.getvalue())

    assert result.is_ok()
    assign.assert_awaited_once_with(session=session, user_id=7, image_id=42)
    upload = create.call_args.kwargs
    assert upload["content_type"] == "image/webp"
    assert upload["filename"].startswith("avatars/")
    with PillowImage.open(BytesIO(upload["data"])) as encoded:
        assert encoded.format == "WEBP"
        assert encoded.size == (512, 512)


async def test_invalid_profile_upload_never_writes_storage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    create = AsyncMock()
    monkeypatch.setattr(Image, "create_image_from_bytes_async", create)
    result = await upload_profile_image_async(
        session=cast(AsyncSession, object()), user_id=7, data=b"invalid image"
    )
    assert result.code() == ResultCode.BAD_REQUEST
    create.assert_not_awaited()
