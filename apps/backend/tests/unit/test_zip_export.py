"""ZIP exports preserve MPEG bytes and source files while adding portable tags."""

import asyncio
import io
import subprocess
import threading
import zipfile
from dataclasses import replace
from pathlib import Path
from unittest.mock import AsyncMock, Mock

import pytest
from mutagen.id3 import ID3  # pyright: ignore[reportPrivateImportUsage]

from result import Result, ResultCode
from tests.fake_object_store import FakeObjectStore
from zipExport.framework import downloadZip
from zipExport.framework.downloadZip import DownloadZip
from zipExport.models.exportFile import AudioTags, ExportFile
from zipExport.utils.archive import build_archive
from zipExport.utils.audioMetadata import read_cover_bytes

# Mutagen's dynamic frame API has no complete member/argument type annotations.
# pyright: reportUnknownMemberType=false, reportUnknownArgumentType=false


# Mutagen dynamically re-exports these public frames without static export hints.


pytestmark = pytest.mark.unit


@pytest.fixture
def mp3(tmp_path: Path) -> Path:
    """Generate real MPEG audio so ffmpeg can also validate the exported payload."""
    path = tmp_path / "source.mp3"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=0.1",
            str(path),
        ],
        check=True,
        capture_output=True,
    )
    return path


@pytest.fixture(autouse=True)
def archive_sources(monkeypatch: pytest.MonkeyPatch, object_store: FakeObjectStore) -> None:
    import zipExport.utils.archive as archive_module

    original = build_archive

    def from_fixtures(zip_path: str, files: list[ExportFile], max_bytes: int) -> int:
        remote: list[ExportFile] = []
        for item in files:
            source = Path(item.key)
            key = source.name
            if source.is_file():
                object_store.objects[key] = source.read_bytes()
            remote.append(replace(item, key=key))
        return original(zip_path=zip_path, files=remote, max_bytes=max_bytes)

    monkeypatch.setattr(archive_module, "build_archive", from_fixtures)
    monkeypatch.setattr(downloadZip, "build_archive", from_fixtures)


def artwork(path: Path) -> bytes:
    result = read_cover_bytes(path.read_bytes())
    assert result is not None
    return result[0]


def _build_archive(path: str, files: list[ExportFile]) -> int:
    import zipExport.utils.archive as archive_module

    return archive_module.build_archive(
        zip_path=path, files=files, max_bytes=downloadZip.MAX_ZIP_BYTES
    )


def mpeg_bytes(data: bytes) -> bytes:
    source = io.BytesIO(data)
    tags = ID3(fileobj=source)
    return data[tags.size :]


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
        assert all(archive.read(name) == video.read_bytes() for name in archive.namelist())


async def test_failed_archive_is_removed(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    media = tmp_path / "media.mp4"
    media.write_bytes(b"media")
    monkeypatch.setattr(downloadZip, "TEMP_PATH", str(tmp_path))
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_container_public_ids_async",
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[])),
    )
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_export_files_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
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
        AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=[])),
    )
    monkeypatch.setattr(
        downloadZip.DownloadZipAccess,
        "get_export_files_async",
        AsyncMock(
            return_value=Result(
                code=ResultCode.OK,
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
        DownloadZip.create_async(session=AsyncMock(), user_id=1, public_ids=["id"], title="Title")
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
    from httpx import ASGITransport, AsyncClient

    from core.access.db.ormModels.user import UserRow
    from zipExport.controllers import downloadZipController as controller

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
        Mock(return_value=Result(code=ResultCode.OK, message="OK", result=user)),
    )
    create = AsyncMock(return_value=Result(code=ResultCode.OK, message="OK", result=str(path)))
    monkeypatch.setattr(controller.DownloadZip, "create_async", create)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/downloader/download-zip", json={"ids": ["song"], "title": "Album"}
        )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert 'filename="Album.zip"' in response.headers["content-disposition"]
    assert response.content == b"zip response bytes"
    assert create.call_args.kwargs["public_ids"] == ["song"]
    assert not path.exists()
