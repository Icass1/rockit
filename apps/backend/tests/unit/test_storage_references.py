"""Schema and multipart contracts for normalized persistent-file references."""

import base64
from pathlib import Path
from typing import cast
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.adminVersionAccess import AdminVersionAccess
from core.access.buildUploadSessionAccess import BuildUploadSessionAccess
from core.access.db.ormModels.appVersion import AppVersionRow
from core.access.db.ormModels.buildUploadSession import BuildUploadSessionRow
from core.access.db.ormModels.image import ImageRow
from core.access.db.ormModels.storageObject import StorageObjectRow
from core.access.storageObjectAccess import StorageObjectAccess
from core.framework.admin import build
from core.framework.admin.build import AdminBuild
from core.framework.storage import Storage
from result import Result, ResultCode
from rockit.access.db.ormModels.song import RockitSongRow
from rockit.access.db.ormModels.video import RockitVideoRow
from spotify.access.db.ormModels.track import TrackRow as SpotifyTrack
from spotifyScrapper.access.db.ormModels.track import TrackRow as ScrapperTrack
from tests.fake_object_store import FakeObjectStore
from youtube.access.db.ormModels.video import VideoRow
from youtubeMusic.access.db.ormModels.track import TrackRow as YoutubeMusicTrack


@pytest.mark.parametrize(
    "table",
    [
        ImageRow.__table__,
        SpotifyTrack.__table__,
        ScrapperTrack.__table__,
        YoutubeMusicTrack.__table__,
        VideoRow.__table__,
        RockitSongRow.__table__,
        RockitVideoRow.__table__,
        AppVersionRow.__table__,
        BuildUploadSessionRow.__table__,
    ],
)
def test_persistent_files_reference_storage_objects_and_have_no_path_column(table: object) -> None:
    from sqlalchemy import Table

    assert isinstance(table, Table)
    assert not {"path", "file_path", "video_path"}.intersection(table.columns.keys())
    assert {fk.target_fullname for fk in table.c.storage_object_id.foreign_keys} == {
        "core.storage_object.id"
    }


def test_key_is_resolved_from_the_related_object() -> None:
    row = RockitVideoRow(id=1, name="Video", duration_ms=1, storage_object_id=8, image_id=2)
    stored = StorageObjectRow(id=8, bucket="test", key="videos/first.mp4")
    row.storage_object = stored
    assert row.storage_object.key == "videos/first.mp4"
    stored.key = "videos/second.mp4"
    assert row.storage_object.key == "videos/second.mp4"


async def test_multipart_retry_does_not_duplicate_chunks_or_use_local_staging(
    object_store: FakeObjectStore,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(build, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(Storage, "ensure_bucket_async", AsyncMock())
    stored = StorageObjectRow(id=12, bucket="rockit-test", key="builds/v2.apk")
    register = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=stored))
    monkeypatch.setattr(StorageObjectAccess, "insert_object_async", register)
    create = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=True))
    monkeypatch.setattr(BuildUploadSessionAccess, "create_async", create)
    session = cast(AsyncSession, object())
    size = 5 * 1024 * 1024
    started = await AdminBuild.start_chunked_upload_async(
        session=session,
        user_id=1,
        file_name="app.apk",
        total_size=size + 3,
        version="2",
        description=None,
    )
    assert started.is_ok()
    assert started.result().chunkSize == size
    assert create.call_args.kwargs["storage_object_id"] == 12
    upload = BuildUploadSessionRow(
        user_id=1,
        storage_object_id=12,
        multipart_upload_id=create.call_args.kwargs["multipart_upload_id"],
        version="2",
        version_filename="v2.apk",
        total_chunks=2,
    )
    upload.storage_object = stored
    monkeypatch.setattr(
        BuildUploadSessionAccess,
        "get_by_public_id_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=upload,
            )
        ),
    )
    monkeypatch.setattr(
        BuildUploadSessionAccess,
        "set_chunks_received_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
                message="OK",
                result=upload,
            )
        ),
    )
    for _ in range(2):
        chunk = await AdminBuild.upload_chunk_async(
            session=session,
            upload_id=started.result().uploadId,
            chunk_index=0,
            chunk_data=base64.b64encode(b"a" * size).decode(),
            total_chunks=2,
        )
        assert chunk.is_ok() and chunk.result().chunksReceived == 1
    incomplete = await AdminBuild.complete_chunked_upload_async(session, started.result().uploadId)
    assert incomplete.code() == ResultCode.BAD_REQUEST
    assert stored.key not in object_store.objects
    chunk = await AdminBuild.upload_chunk_async(
        session=session,
        upload_id=started.result().uploadId,
        chunk_index=1,
        chunk_data=base64.b64encode(b"end").decode(),
        total_chunks=2,
    )
    assert chunk.is_ok() and chunk.result().chunksReceived == 2
    version = AppVersionRow(
        version="2", apk_filename="v2.apk", storage_object_id=12, public_id="v2"
    )
    add_version = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=version))
    monkeypatch.setattr(AdminVersionAccess, "add_version_async", add_version)
    monkeypatch.setattr(BuildUploadSessionAccess, "delete_by_public_id_async", AsyncMock())
    result = await AdminBuild.complete_chunked_upload_async(session, started.result().uploadId)
    assert result.is_ok()
    assert add_version.call_args.kwargs["storage_object_id"] == 12
    assert object_store.objects[stored.key] == b"a" * size + b"end"
    assert not object_store.uploads
    assert not list(tmp_path.iterdir())


async def test_referenced_storage_object_does_not_lose_s3_bytes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from unittest.mock import Mock

    from core.framework import storage
    from core.utils.afterCommit import run_after_commit

    row = StorageObjectRow(id=12, bucket="test", key="song.mp3")
    delete_row = AsyncMock(
        return_value=ResultCode(code=ResultCode.BAD_REQUEST, message="Referenced")
    )
    monkeypatch.setattr(StorageObjectAccess, "delete_object_async", delete_row)
    remove_bytes = Mock()
    monkeypatch.setattr(storage, "_delete_object", remove_bytes)
    session = AsyncSession()
    result = await Storage.delete_object_async(session, row)
    assert result.is_not_ok()
    await run_after_commit(session)
    remove_bytes.assert_not_called()
    delete_row.return_value = ResultCode(code=ResultCode.OK, message="OK")
    result = await Storage.delete_object_async(session, row)
    assert result.is_ok()
    remove_bytes.assert_not_called()
    await run_after_commit(session)
    remove_bytes.assert_called_once_with(bucket="test", key="song.mp3")
    await session.close()
