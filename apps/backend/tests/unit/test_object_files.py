"""Persistent files use S3; local copies exist only while processing an object."""

from collections.abc import AsyncGenerator
from pathlib import Path
from typing import cast
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.storageObjectAccess import StorageObjectAccess
from core.framework.objectFiles import ObjectFiles
from core.framework.storage import Storage
from result import Result, ResultCode
from tests.fake_object_store import FakeObjectStore


@pytest.mark.parametrize(
    "key", ["/app/media/song.mp3", "../song", "a/../song", "a\\song", "\x00", ""]
)
def test_local_paths_are_not_storage_keys(key: str) -> None:
    with pytest.raises(ValueError):
        ObjectFiles.key(key)


async def test_publishing_registers_s3_key_without_moving_the_processing_input(
    object_store: FakeObjectStore,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "input.mp3"
    source.write_bytes(b"media bytes")
    row = StorageObjectRow(bucket="rockit-test", key="spotify/song.mp3")
    register = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=row))
    monkeypatch.setattr(Storage, "ensure_bucket_async", AsyncMock())
    monkeypatch.setattr(StorageObjectAccess, "insert_object_async", register)
    session = cast(AsyncSession, object())

    result = await ObjectFiles.upload_async(session=session, source=str(source), key=row.key)

    assert result.is_ok() and result.result() is row
    assert object_store.objects[row.key] == b"media bytes"
    assert source.read_bytes() == b"media bytes"
    assert register.call_args.kwargs["size_bytes"] == len(b"media bytes")
    assert register.call_args.kwargs["content_type"] == "audio/mpeg"


async def test_temporary_materialization_is_removed_after_success_and_failure(
    object_store: FakeObjectStore,
) -> None:
    object_store.objects["youtube/video.mp4"] = b"video"
    local = ""
    with pytest.raises(RuntimeError):
        async with ObjectFiles.local_copy_async("youtube/video.mp4") as local:
            assert Path(local).read_bytes() == b"video"
            raise RuntimeError("conversion failed")
    assert not Path(local).exists()
    assert object_store.objects["youtube/video.mp4"] == b"video"


async def test_stream_closes_s3_body_when_client_stops_reading(
    object_store: FakeObjectStore,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import io

    body = io.BytesIO(b"x" * 200000)
    object_store.objects["song.mp3"] = body.getvalue()
    monkeypatch.setattr(object_store, "get_object", Mock(return_value={"Body": body}))
    response = await ObjectFiles.stream_async("song.mp3")
    assert response.is_ok()
    iterator = cast(AsyncGenerator[bytes], response.result().body_iterator)
    assert len(await anext(iterator)) == 64 * 1024
    await iterator.aclose()
    assert body.closed


async def test_video_audio_cache_is_shared_via_s3_and_processing_files_are_discarded(
    object_store: FakeObjectStore,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from core.framework.media.stream import MediaStream

    object_store.objects["youtube/video.mp4"] = b"video"
    encoded = tmp_path / "encoded.mp3"
    encoded.write_bytes(b"mp3 bytes")
    prepare = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=str(encoded)))
    monkeypatch.setattr(MediaStream, "_prepare_audio_async", prepare)
    first = await MediaStream.stream_audio_object_async("youtube/video.mp4", "bytes=0-1")
    assert first.is_ok()
    assert first.result().status_code == 206
    assert not encoded.exists()
    assert len([key for key in object_store.objects if key.startswith("derived-audio/")]) == 1
    second = await MediaStream.stream_audio_object_async("youtube/video.mp4", None)
    assert second.is_ok()
    prepare.assert_awaited_once()
    for result in (first, second):
        response = result.result()
        assert response.background is not None
        await response.background()


async def test_single_build_upload_publishes_to_s3_and_removes_assembly_file(
    object_store: FakeObjectStore,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    import base64

    from core.access.adminVersionAccess import AdminVersionAccess
    from core.access.db.ormModels.appVersion import AppVersionRow
    from core.framework.admin import build
    from core.framework.admin.build import AdminBuild

    monkeypatch.setattr(build, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(Storage, "ensure_bucket_async", AsyncMock())
    stored = StorageObjectRow(bucket="rockit-test", key="builds/v1.apk", id=12)
    monkeypatch.setattr(
        StorageObjectAccess,
        "insert_object_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=stored,
            )
        ),
    )
    version = AppVersionRow(
        version="1", apk_filename="v1.apk", public_id="version", storage_object_id=12
    )
    monkeypatch.setattr(
        AdminVersionAccess,
        "add_version_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=version,
            )
        ),
    )
    result = await AdminBuild.upload_apk_single_async(
        session=cast(AsyncSession, object()),
        user_id=1,
        file_name="app.apk",
        file_content=base64.b64encode(b"apk bytes").decode(),
        version="1",
        description=None,
    )
    assert result.is_ok()
    assert object_store.objects["builds/v1.apk"] == b"apk bytes"
    assert list(tmp_path.iterdir()) == []
