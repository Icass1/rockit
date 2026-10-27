"""ZIP export behavior that does not require ffmpeg."""

# Mutagen's dynamic frame API has no complete member/argument type annotations.
# pyright: reportUnknownMemberType=false, reportUnknownArgumentType=false

import asyncio
import threading
import zipfile
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
from mutagen.id3 import ID3

from backend.core.aResult import AResult, AResultCode
from backend.zipExport.framework import downloadZip
from backend.zipExport.framework.downloadZip import DownloadZip
from backend.zipExport.utils.archive import build_archive
from backend.zipExport.models.exportFile import AudioTags, ExportFile

pytestmark = pytest.mark.unit


def _build_archive(path: str, files: list[ExportFile]) -> int:
    return build_archive(
        zip_path=path, files=files, max_bytes=downloadZip.MAX_ZIP_BYTES
    )


def test_duplicate_safe_names_missing_files_and_unchanged_video(tmp_path: Path) -> None:
    video = tmp_path / "video.mp4"
    video.write_bytes(b"unchanged video bytes")
    path = tmp_path / "export.zip"
    assert (
        _build_archive(
            str(path),
            [
                ExportFile("../bad:name", str(video)),
                ExportFile("../bad:name", str(video)),
                ExportFile("missing", str(tmp_path / "missing.mp3")),
            ],
        )
        == 2
    )
    with zipfile.ZipFile(path) as archive:
        assert len(archive.namelist()) == 2
        assert len(set(archive.namelist())) == 2
        assert all("/" not in name and ":" not in name for name in archive.namelist())
        assert all(
            archive.read(name) == video.read_bytes() for name in archive.namelist()
        )


async def test_failed_archive_is_removed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    media = tmp_path / "media.mp4"
    media.write_bytes(b"media")
    monkeypatch.setattr(downloadZip, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_container_public_ids_async",
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result=[])),
    )
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_export_files_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=[ExportFile("Video", str(media))],
            )
        ),
    )

    def fail(**kwargs: object) -> int:
        raise OSError("disk full")

    monkeypatch.setattr(downloadZip, "build_archive", fail)
    result = await DownloadZip.create_async(
        session=AsyncMock(), user_id=1, public_ids=["id"], title="Title"
    )
    assert result.is_not_ok()
    assert not list(tmp_path.glob("rockit-*.zip"))


def test_corrupt_tags_fall_back_to_unchanged_file(tmp_path: Path) -> None:
    path = tmp_path / "broken.mp3"
    path.write_bytes(b"ID3\xffbroken header")
    archive_path = tmp_path / "export.zip"
    _build_archive(str(archive_path), [ExportFile("Title", str(path), AudioTags())])
    with zipfile.ZipFile(archive_path) as archive:
        assert archive.read("Title.mp3") == path.read_bytes()


async def test_cancelled_export_removes_zip_after_worker_finishes(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    started, finish, finished = threading.Event(), threading.Event(), threading.Event()
    monkeypatch.setattr(downloadZip, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_container_public_ids_async",
        AsyncMock(return_value=AResult(code=AResultCode.OK, message="OK", result=[])),
    )
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_export_files_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.OK,
                message="OK",
                result=[ExportFile("Video", "source.mp4")],
            )
        ),
    )

    def worker(zip_path: str, files: list[ExportFile], max_bytes: int) -> int:
        started.set()
        try:
            assert finish.wait(timeout=5)
            Path(zip_path).write_bytes(b"finished zip")
            return 1
        finally:
            finished.set()

    monkeypatch.setattr(downloadZip, "build_archive", worker)
    task = asyncio.ensure_future(
        DownloadZip.create_async(
            session=AsyncMock(), user_id=1, public_ids=["id"], title="Title"
        )
    )
    try:
        assert await asyncio.to_thread(started.wait, 5)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    finally:
        finish.set()
    assert await asyncio.to_thread(finished.wait, 5)
    # Let the completed worker's cleanup callback run on the event loop.
    for _ in range(100):
        if not list(tmp_path.glob("rockit-*.zip")):
            break
        await asyncio.sleep(0.01)
    assert not list(tmp_path.glob("rockit-*.zip"))


async def test_http_route_keeps_contract_and_removes_completed_zip(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from fastapi import FastAPI
    from httpx import AsyncClient, ASGITransport
    from backend.core.access.db.ormModels.user import UserRow
    from backend.zipExport.controllers import downloadZipController as controller

    path = tmp_path / "export.zip"
    path.write_bytes(b"zip response bytes")
    app = FastAPI()
    app.include_router(controller.router)
    app.dependency_overrides[controller.AuthMiddleware.auth_dependency] = lambda: None
    user = UserRow(public_id="user", username="user", image_id=1)
    user.id = 1
    monkeypatch.setattr(
        controller.DBSessionMiddleware, "get_session", Mock(return_value=AsyncMock())
    )
    monkeypatch.setattr(
        controller.AuthMiddleware,
        "get_current_user",
        Mock(return_value=AResult(code=AResultCode.OK, message="OK", result=user)),
    )
    create = AsyncMock(
        return_value=AResult(code=AResultCode.OK, message="OK", result=str(path))
    )
    monkeypatch.setattr(controller.DownloadZip, "create_async", create)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/downloader/download-zip", json={"ids": ["song"], "title": "Album"}
        )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert 'filename="Album.zip"' in response.headers["content-disposition"]
    assert response.content == b"zip response bytes"
    assert create.call_args.kwargs["public_ids"] == ["song"]
    assert not path.exists()
