from typing import Any
from collections.abc import AsyncIterator, Callable, Awaitable
from sqlalchemy.ext.asyncio import AsyncSession
from mypy_boto3_s3 import S3Client
from starlette.responses import Response, StreamingResponse
from pathlib import Path

"""Real PostgreSQL + Silo workflows. External music providers are replaced at their network boundary."""

import base64
import hashlib
import os
import shutil
import subprocess
from uuid import uuid4
import zipfile
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi import FastAPI, HTTPException, Request
from PIL import Image as PILImage
from sqlalchemy import select

from backend import constants
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.storageObject import StorageObjectRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.uploadItem import UploadItemRow
from backend.core.access.objectStore import get_s3_client
from backend.core.access.uploadItemAccess import UploadItemAccess
from backend.core.framework.storage import Storage
from backend.core.framework.uploadStaging import UploadStaging
from backend.core.framework.admin.build import AdminBuild
from backend.core.framework.media.stream import MediaStream
from backend.core.framework.downloader.downloadZip import DownloadZip
from backend.core.framework.notification import (
    Notification,
    APPLICATION_MESSAGE_NOTIFICATION,
)
from backend.core.responses.notificationResponses import (
    NotificationReplacement,
    NotificationDestination,
)
from backend.rockit.framework.rockit import Rockit
from backend.rockit.access.db.ormModels.song import RockitSongRow
from backend.rockit.access.db.ormModels.video import RockitVideoRow
from backend.core.middlewares.authMiddleware import AuthMiddleware

pytestmark = pytest.mark.integration


@pytest.fixture
async def silo(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, database: AsyncSession
) -> AsyncIterator[S3Client]:
    endpoint = os.environ.get("ROCKIT_TEST_S3_ENDPOINT")
    if not endpoint:
        pytest.skip("Set ROCKIT_TEST_S3_ENDPOINT to the disposable Silo endpoint")
    bucket = f"rockit-test-{uuid4().hex}"
    for key, value in {
        "S3_PRIVATE_ENDPOINT_URL": endpoint,
        "S3_PUBLIC_ENDPOINT_URL": endpoint,
        "S3_ACCESS_KEY": "rockit-test",
        "S3_SECRET_KEY": "rockit-test-secret",
        "S3_BUCKET": bucket,
        "S3_REGION": "us-east-1",
        "TEMP_PATH": str(tmp_path),
    }.items():
        monkeypatch.setattr(constants, key, value)
    # Existing modules import scratch configuration by value.
    for module in [
        "backend.core.framework.media.image",
        "backend.rockit.framework.rockit",
        "backend.core.framework.admin.build",
        "backend.core.controllers.uploadController",
        "backend.core.framework.downloader.downloadZip",
        "backend.core.framework.media.stream",
    ]:
        import importlib

        loaded = importlib.import_module(module)
        for key in ["TEMP_PATH", "IMAGES_PATH", "MEDIA_PATH", "BUILDS_PATH"]:
            if hasattr(loaded, key):
                value = (
                    str(tmp_path / key.lower()) if key != "TEMP_PATH" else str(tmp_path)
                )
                monkeypatch.setattr(loaded, key, value)
    get_s3_client.cache_clear()
    ready = await Storage.ensure_bucket_async()
    assert ready.is_ok(), ready.info()
    yield get_s3_client()
    await database.rollback()
    client = get_s3_client()
    objects = client.list_objects_v2(Bucket=bucket).get("Contents", [])
    if objects:
        client.delete_objects(
            Bucket=bucket,
            Delete={"Objects": [{"Key": item.get("Key", "")} for item in objects]},
        )
    client.delete_bucket(Bucket=bucket)
    get_s3_client.cache_clear()


@pytest.fixture
def media_files(tmp_path: Path) -> tuple[Path, Path, Path]:
    audio = tmp_path / "song.mp3"
    subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=0.5",
            "-c:a",
            "libmp3lame",
            str(audio),
        ],
        check=True,
        capture_output=True,
    )
    video = tmp_path / "video.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=64x64:d=0.5",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=0.5",
            "-c:v",
            "mpeg4",
            "-c:a",
            "aac",
            "-shortest",
            str(video),
        ],
        check=True,
        capture_output=True,
    )
    image = tmp_path / "cover.jpg"
    PILImage.new("RGB", (32, 32), "red").save(image)
    return audio, video, image


async def response_bytes(response: Response | StreamingResponse) -> bytes:
    if isinstance(response, StreamingResponse):
        return b"".join(
            chunk.encode() if isinstance(chunk, str) else bytes(chunk)
            for chunk in [item async for item in response.body_iterator]
        )
    return bytes(response.body)


async def test_real_upload_stream_signed_url_and_rollback(
    database: AsyncSession, silo: S3Client, tmp_path: Path
) -> None:
    file = tmp_path / "source.mp3"
    file.write_bytes(b"0123456789")
    uploaded = await Storage.upload_file_async(session=database, path=str(file))
    assert uploaded.is_ok(), uploaded.info()
    obj = uploaded.result()
    key = obj.key
    await database.commit()
    assert obj.sha256 == hashlib.sha256(file.read_bytes()).hexdigest()
    url = Storage.get_object_url(storage_object=obj)
    async with httpx.AsyncClient(trust_env=False) as client:
        full = await client.get(url)
        assert full.status_code == 200 and full.content == file.read_bytes()
        ranged = await client.get(url, headers={"Range": "bytes=0-1"})
        assert ranged.status_code == 206 and ranged.content == b"01"
    rolled = await Storage.upload_file_async(session=database, path=str(file))
    assert rolled.is_ok()
    rolled_key = rolled.result().key
    await database.rollback()
    assert silo.head_object(Bucket=constants.S3_BUCKET, Key=key)["ContentLength"] == 10
    with pytest.raises(silo.exceptions.ClientError):
        silo.head_object(Bucket=constants.S3_BUCKET, Key=rolled_key)


async def test_staged_chunks_survive_scratch_loss_and_retries(
    database: AsyncSession, silo: S3Client, tmp_path: Path
) -> None:
    upload_id = uuid4().hex
    for index, data in [(1, b"world"), (0, b"hello "), (1, b"world")]:
        source = tmp_path / f"part-{index}"
        source.write_bytes(data)
        saved = await UploadStaging.save_path_async(
            session=database,
            upload_id=upload_id,
            user_id=1,
            name=f"chunks/{index}",
            path=str(source),
        )
        assert saved.is_ok(), saved.info()
        await database.commit()
        source.unlink()
    items = await UploadItemAccess.list_async(
        session=database, upload_id=upload_id, user_id=1
    )
    assert items.is_ok() and len(items.result()) == 2
    bad = await UploadStaging.assemble_async(
        session=database,
        upload_id=upload_id,
        user_id=2,
        total=2,
        output=str(tmp_path / "wrong"),
    )
    assert bad.code() == AResultCode.BAD_REQUEST
    missing = await UploadStaging.assemble_async(
        session=database,
        upload_id=upload_id,
        user_id=1,
        total=3,
        output=str(tmp_path / "missing"),
    )
    assert missing.code() == AResultCode.BAD_REQUEST
    assembled = await UploadStaging.assemble_async(
        session=database,
        upload_id=upload_id,
        user_id=1,
        total=2,
        output=str(tmp_path / "assembled"),
    )
    assert assembled.is_ok() and Path(assembled.result()).read_bytes() == b"hello world"
    cleared = await UploadStaging.clear_async(
        session=database, upload_id=upload_id, user_id=1
    )
    assert cleared.is_ok(), cleared.info()
    await database.commit()
    assert (
        list(
            await database.scalars(
                select(UploadItemRow).where(UploadItemRow.upload_id == upload_id)
            )
        )
        == []
    )


async def test_song_album_video_images_frames_audio_and_zip(
    database: AsyncSession,
    silo: S3Client,
    media_files: tuple[Path, Path, Path],
    tmp_path: Path,
) -> None:
    audio, video, image = media_files
    Rockit.provider_id = 2
    song = await Rockit.upload_song_async(
        session=database,
        title="A song",
        artist_names=["Artist"],
        file_path=str(audio),
        image_path=str(image),
        disc_number=1,
        track_number=1,
    )
    assert song.is_ok(), song.info()
    await database.commit()
    row = await database.scalar(
        select(RockitSongRow)
        .join(CoreMediaRow, CoreMediaRow.id == RockitSongRow.id)
        .where(CoreMediaRow.public_id == song.result().publicId)
    )
    assert row and row.storage_object_id
    streamed = await Storage.stream_async(
        storage_object=row.storage_object, range_header="bytes=0-1"
    )
    assert (
        streamed.is_ok()
        and await response_bytes(streamed.result()) == audio.read_bytes()[:2]
    )
    stored_image = await database.get(ImageRow, row.image_id)
    assert stored_image is not None and stored_image.storage_object is not None
    assert stored_image.storage_object_id
    assert (
        silo.head_object(
            Bucket=constants.S3_BUCKET, Key=stored_image.storage_object.key
        )["ContentType"]
        == "image/jpeg"
    )
    album = await Rockit.upload_album_async(
        session=database,
        title="Album",
        artist_name=["Artist"],
        song_titles=["First", "Second"],
        song_paths={"First": str(audio), "Second": str(audio)},
        cover_path=str(image),
        release_date="2026",
    )
    assert album.is_ok(), album.info()
    uploaded_video = await Rockit.upload_video_async(
        session=database,
        title="Video",
        artist_names=["Artist"],
        file_path=str(video),
        image_path=str(image),
    )
    assert uploaded_video.is_ok(), uploaded_video.info()
    await database.commit()
    video_row = await database.scalar(
        select(RockitVideoRow)
        .join(CoreMediaRow, CoreMediaRow.id == RockitVideoRow.id)
        .where(CoreMediaRow.public_id == uploaded_video.result().publicId)
    )
    assert video_row is not None and video_row.file_path is not None
    frame = await Rockit.get_frame_async(
        file_path=video_row.file_path,
        public_id=uploaded_video.result().publicId,
        timestamp_ms=100,
    )
    assert frame.is_ok() and len(frame.result()) > 10
    extracted = await MediaStream.stream_audio_from_video_async(
        video_path=video_row.file_path, range_header="bytes=0-1"
    )
    assert extracted.is_ok() and len(await response_bytes(extracted.result())) == 2
    archive = await DownloadZip.create_async(
        session=database,
        user_id=1,
        public_ids=[song.result().publicId, uploaded_video.result().publicId],
        title="Export",
    )
    assert archive.is_ok(), archive.info()
    with zipfile.ZipFile(archive.result()) as bundle:
        assert len(bundle.namelist()) == 2
        assert sorted(bundle.read(name) for name in bundle.namelist()) == sorted(
            [audio.read_bytes(), video.read_bytes()]
        )
    # Foreign keys must reject physical deletion of referenced content.
    assert row.storage_object is not None
    protected_key = row.storage_object.key
    protected = await Storage.delete_async(
        session=database, storage_object=row.storage_object
    )
    assert protected.is_not_ok()
    assert (
        silo.head_object(Bucket=constants.S3_BUCKET, Key=protected_key)["ContentLength"]
        > 0
    )


async def test_apk_chunks_and_single_upload(
    database: AsyncSession, silo: S3Client, tmp_path: Path
) -> None:
    data = b"a" * constants.CHUNK_SIZE + b"end"
    started = await AdminBuild.start_chunked_upload_async(
        session=database,
        user_id=1,
        file_name="app.apk",
        total_size=len(data),
        version="1.0",
        description="Build",
    )
    assert started.is_ok(), started.info()
    upload_id = started.result().uploadId
    await database.commit()
    forbidden = await AdminBuild.upload_chunk_async(
        session=database,
        user_id=2,
        upload_id=upload_id,
        chunk_index=0,
        total_chunks=2,
        chunk_data=base64.b64encode(data[: constants.CHUNK_SIZE]).decode(),
    )
    assert forbidden.code() == AResultCode.NOT_FOUND
    for index in [1, 0, 0]:
        chunk = data[index * constants.CHUNK_SIZE : (index + 1) * constants.CHUNK_SIZE]
        result = await AdminBuild.upload_chunk_async(
            session=database,
            user_id=1,
            upload_id=upload_id,
            chunk_index=index,
            total_chunks=2,
            chunk_data=base64.b64encode(chunk).decode(),
        )
        assert result.is_ok(), result.info()
        await database.commit()
    assert result.result().chunksReceived == 2
    completed = await AdminBuild.complete_chunked_upload_async(
        session=database, user_id=1, upload_id=upload_id
    )
    assert completed.is_ok(), completed.info()
    await database.commit()
    from backend.core.framework.version import Version

    version = await Version.get_by_filename_async(session=database, filename="v1.0.apk")
    assert version.is_ok()
    stream = await Storage.stream_async(storage_object=version.result().storage_object)
    assert stream.is_ok() and await response_bytes(stream.result()) == data
    single = await AdminBuild.upload_apk_single_async(
        session=database,
        user_id=1,
        file_name="app.apk",
        file_content=base64.b64encode(b"single").decode(),
        version="2.0",
        description=None,
    )
    assert single.is_ok(), single.info()


async def test_notifications_are_transactional_and_owned(
    database: AsyncSession, silo: S3Client
) -> None:
    for user_id in [1, 2]:
        result = await Notification.set_subscriptions_async(
            session=database,
            user_public_id=f"user-{user_id}",
            event_keys=["APPLICATION_MESSAGE"],
        )
        assert result.is_ok(), result.info()
    await database.commit()
    sent = await Notification.emit_async(
        session=database,
        event=APPLICATION_MESSAGE_NOTIFICATION,
        replacements=[NotificationReplacement(key="MESSAGE", value="Hello")],
        destination=NotificationDestination(path="/settings"),
    )
    assert sent.is_ok() and sent.result() == 2
    await database.rollback()
    page = await Notification.list_async(
        session=database, user_id=1, limit=20, offset=0
    )
    assert page.is_ok() and page.result()[1] == 0
    sent = await Notification.emit_async(
        session=database,
        event=APPLICATION_MESSAGE_NOTIFICATION,
        replacements=[NotificationReplacement(key="MESSAGE", value="Hello")],
        destination=NotificationDestination(path="/settings"),
    )
    assert sent.is_ok()
    await database.commit()
    page = await Notification.list_async(
        session=database, user_id=1, limit=20, offset=0
    )
    rows, unread, total = page.result()
    assert unread == total == 1
    wrong = await Notification.mark_read_async(
        session=database, user_id=2, public_id=rows[0].public_id
    )
    assert wrong.code() == AResultCode.NOT_FOUND
    read = await Notification.mark_read_async(
        session=database, user_id=1, public_id=rows[0].public_id
    )
    assert read.is_ok() and read.result().read_at


@pytest.fixture
async def api(
    database: AsyncSession, silo: S3Client
) -> AsyncIterator[httpx.AsyncClient]:
    from backend.core.controllers.userController import router as users
    from backend.core.controllers.uploadController import router as uploads
    from backend.rockit.controllers.rockitController import router as rockit
    from backend.core.controllers.mediaController import router as media
    from backend.core.controllers.imageController import router as images
    from backend.core.controllers.versionController import router as versions
    from backend.core.controllers.notificationController import router as notifications
    from backend.core.controllers.notificationSubscriptionsController import (
        router as subscriptions,
    )

    from backend.spotify.controllers.spotifyController import router as spotify
    from backend.spotifyScrapper.controllers.spotifyScrapperController import (
        router as scrapper,
    )
    from backend.youtubeMusic.controllers.youtubeMusicController import (
        router as youtube_music,
    )
    from backend.youtube.controllers.youtubeController import public_router as youtube

    app = FastAPI()
    for router in [
        uploads,
        rockit,
        media,
        images,
        versions,
        notifications,
        subscriptions,
        users,
        spotify,
        scrapper,
        youtube_music,
        youtube,
    ]:
        app.include_router(router)

    async def signed_in(request: Request) -> None:
        key = request.headers.get("x-test-user")
        if key not in ("1", "2"):
            raise HTTPException(status_code=401, detail="Not logged in")
        request.state.user = await database.get(UserRow, int(key))
        database.info["added_by"] = int(key)

    app.dependency_overrides[AuthMiddleware.auth_dependency] = signed_in
    app.dependency_overrides[AuthMiddleware.admin_dependency] = signed_in

    @app.middleware("http")
    async def session_scope(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.db = database
        response = await call_next(request)
        if response.status_code >= 400:
            await database.rollback()
        else:
            await database.commit()
        return response

    Rockit.provider_id = 2
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        headers={"x-test-user": "1"},
    ) as client:
        yield client


async def test_http_direct_upload_range_head_image_and_notifications(
    api: httpx.AsyncClient,
    database: AsyncSession,
    silo: S3Client,
    media_files: tuple[Path, Path, Path],
) -> None:
    audio, _, image = media_files
    request = {
        "title": "HTTP Song",
        "artistNames": ["Artist"],
        "fileSize": audio.stat().st_size,
        "discNumber": 1,
        "trackNumber": 1,
    }
    unauthorized = await api.post(
        "/upload/song/start", json=request, headers={"x-test-user": "none"}
    )
    assert unauthorized.status_code == 401
    started = await api.post("/upload/song/start", json=request)
    assert started.status_code == 200, started.text
    upload_id = started.json()["uploadId"]
    wrong = await api.post(
        f"/upload/{upload_id}/file",
        files={"file": ("audio.mp3", audio.read_bytes())},
        headers={"x-test-user": "2"},
    )
    assert wrong.status_code == 404
    uploaded = await api.post(
        f"/upload/{upload_id}/file",
        files={
            "file": ("audio.mp3", audio.read_bytes(), "audio/mpeg"),
            "image": ("cover.jpg", image.read_bytes(), "image/jpeg"),
        },
    )
    assert uploaded.status_code == 200, uploaded.text
    public_id = uploaded.json()["publicId"]
    for bounds, status, data in [
        ("bytes=0-1", 206, audio.read_bytes()[:2]),
        ("bytes=-8", 206, audio.read_bytes()[-8:]),
        ("bytes=999999-", 416, b""),
    ]:
        response = await api.get(
            f"/rockit/audio/{public_id}", headers={"Range": bounds}
        )
        assert response.status_code == status, response.text
        assert response.content == data
    head = await api.head(f"/rockit/audio/{public_id}")
    assert (
        head.status_code == 200
        and head.content == b""
        and int(head.headers["content-length"]) == audio.stat().st_size
    )
    row = await database.scalar(
        select(RockitSongRow)
        .join(CoreMediaRow, CoreMediaRow.id == RockitSongRow.id)
        .where(CoreMediaRow.public_id == public_id)
    )
    assert row is not None
    cover = await database.get(ImageRow, row.image_id)
    assert cover is not None
    assert cover.added_by == 1
    response = await api.get(f"/media/image/{cover.public_id}")
    assert response.status_code == 200 and response.content == image.read_bytes()
    blur = await api.get(f"/media/image/blur/{cover.public_id}")
    assert blur.status_code == 200 and blur.content
    settings = await api.get("/user")
    assert settings.status_code == 200, settings.text
    assert settings.json()["queueType"] == "SORTED"
    subscribed = await api.patch(
        "/users/user-1/notification-subscriptions",
        json={"eventKeys": ["APPLICATION_MESSAGE"]},
    )
    assert subscribed.status_code == 200, subscribed.text
    emitted = await Notification.emit_async(
        session=database,
        event=APPLICATION_MESSAGE_NOTIFICATION,
        replacements=[NotificationReplacement(key="MESSAGE", value="Ready")],
        destination=NotificationDestination(path="/settings"),
    )
    assert emitted.is_ok()
    await database.commit()
    page = await api.get("/notifications")
    assert page.status_code == 200 and page.json()["unreadCount"] == 1
    public_id = page.json()["items"][0]["publicId"]
    wrong = await api.patch(
        f"/notifications/{public_id}/read", headers={"x-test-user": "2"}
    )
    assert wrong.status_code == 404
    read = await api.patch(f"/notifications/{public_id}/read")
    assert read.status_code == 200 and read.json()["readAt"]


async def test_http_chunks_resume_and_album_retry(
    api: httpx.AsyncClient,
    database: AsyncSession,
    silo: S3Client,
    media_files: tuple[Path, Path, Path],
    tmp_path: Path,
) -> None:
    audio, _, image = media_files
    request = {
        "title": "Chunked",
        "artistNames": ["Artist"],
        "fileSize": audio.stat().st_size,
        "discNumber": 1,
        "trackNumber": 1,
    }
    started = await api.post("/upload/song/start", json=request)
    upload_id = started.json()["uploadId"]
    invalid = await api.post(
        f"/upload/{upload_id}/chunk?index=-1&total=2", files={"chunk": ("part", b"bad")}
    )
    assert invalid.status_code == 400
    data = audio.read_bytes()
    middle = len(data) // 2
    for index, chunk in [(1, data[middle:]), (0, data[:middle]), (1, data[middle:])]:
        saved = await api.post(
            f"/upload/{upload_id}/chunk?index={index}&total=2",
            files={"chunk": ("part", chunk)},
        )
        assert saved.status_code == 200, saved.text
    import backend.core.controllers.uploadController as controller

    shutil.rmtree(Path(controller.MEDIA_PATH) / "rockit" / "uploads" / upload_id)
    done = await api.post(
        f"/upload/{upload_id}/assemble?total=2",
        files={"image": ("cover.jpg", image.read_bytes(), "image/jpeg")},
    )
    assert done.status_code == 200, done.text
    playback = await api.get(f"/rockit/audio/{done.json()['publicId']}")
    assert playback.content == data
    request["title"] = "First"
    album = await api.post(
        "/upload/album/start",
        json={
            "title": "Album HTTP",
            "artistNames": ["Artist"],
            "releaseDate": "2026",
            "songs": [request, request | {"title": "Second"}],
        },
    )
    assert album.status_code == 200, album.text
    album_id = album.json()["uploadId"]
    cover = await api.post(
        f"/upload/album/{album_id}/cover",
        files={"file": ("cover.jpg", image.read_bytes(), "image/jpeg")},
    )
    assert cover.status_code == 200, cover.text
    for index in [0, 0, 1]:
        part = await api.post(
            f"/upload/album/{album_id}/song-index/{index}",
            files={"file": ("song.mp3", data, "audio/mpeg")},
        )
        assert part.status_code == 200, part.text
    assert part.json()["publicId"]


async def test_http_apk_delivery_uses_storage_and_counts_get(
    api: httpx.AsyncClient, database: AsyncSession, silo: S3Client
) -> None:
    from backend.core.framework.version import Version

    added = await AdminBuild.upload_apk_single_async(
        session=database,
        user_id=1,
        file_name="app.apk",
        file_content=base64.b64encode(b"APK payload").decode(),
        version="3.0",
        description=None,
    )
    assert added.is_ok(), added.info()
    await database.commit()
    head = await api.head("/version/latest/apk")
    assert head.status_code == 200 and head.content == b""
    downloaded = await api.get("/version/apk/v3.0.apk", headers={"Range": "bytes=0-2"})
    assert downloaded.status_code == 206 and downloaded.content == b"APK"
    version = await Version.get_by_filename_async(session=database, filename="v3.0.apk")
    assert version.is_ok() and version.result().downloads == 1
    missing = await api.get("/version/apk/missing.apk")
    assert missing.status_code == 404


@pytest.mark.parametrize(
    "provider", ["spotify", "spotify_scrapper", "youtube_music", "youtube"]
)
async def test_provider_download_publishes_s3_reference(
    api: httpx.AsyncClient,
    database: AsyncSession,
    silo: S3Client,
    media_files: tuple[Path, Path, Path],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    provider: str,
) -> None:
    from importlib import import_module
    from sqlalchemy import insert
    from backend.core.access.db.base import CoreBase
    from backend.youtube.framework.youtubeDownloader import YouTubeDownloader

    from backend.youtube.framework.youtube import YouTube

    monkeypatch.setattr(YouTube, "provider_name", "youtube", raising=False)
    tables = CoreBase.metadata.tables
    for ident, kind in [
        (200, 1 if provider == "youtube" else 2),
        (201, 5 if provider == "youtube" else 4),
    ]:
        await database.execute(
            insert(tables["core.media"]),
            dict(
                id=ident,
                public_id=f"{provider}-{ident}",
                provider_id=2,
                media_type_key=kind,
            ),
        )
    parent = "channel" if provider == "youtube" else "album"
    parent_table = tables[f"{provider}.{parent}"]
    track_table = tables[
        f"{provider}.video" if provider == "youtube" else f"{provider}.track"
    ]
    parent_values: dict[str, Any] = dict(id=200, image_id=1)
    for column in parent_table.columns:
        if (
            column.name in parent_values
            or column.nullable
            or column.default
            or column.server_default
        ):
            continue
        parent_values[column.name] = (
            1 if column.type.python_type == int else f"test-{column.name}"
        )
    await database.execute(insert(parent_table), parent_values)
    values: dict[str, Any] = (
        dict(id=201, channel_id=200)
        if provider == "youtube"
        else dict(id=201, album_id=200)
    )
    if provider in ["youtube", "youtube_music"]:
        values["image_id"] = 1
    if "download_url" in track_table.c:
        values["download_url"] = "https://youtube.com/watch?v=test"
    for column in track_table.columns:
        if (
            column.name in values
            or column.nullable
            or column.default
            or column.server_default
        ):
            continue
        values[column.name] = (
            1 if column.type.python_type == int else f"test-{column.name}"
        )
    await database.execute(insert(track_table), values)
    await database.commit()
    audio, video, _ = media_files
    source = (
        tmp_path
        / f'{provider}-download{video.suffix if provider=="youtube" else audio.suffix}'
    )
    shutil.copyfile(video if provider == "youtube" else audio, source)
    expected = source.read_bytes()
    downloader = AsyncMock(
        return_value=AResult.ok(
            result={
                "filepath": str(source),
                "source_url": "https://youtube.com/watch?v=test",
                "duration_ms": 500,
            }
        )
    )
    monkeypatch.setattr(
        YouTubeDownloader,
        "download_as_mp4_async" if provider == "youtube" else "download_as_mp3_async",
        downloader,
    )
    common = dict(
        public_id=f"{provider}-201", download_id=100, download_group_id=100, user_id=1
    )
    if provider in ["spotify", "spotify_scrapper"]:
        domain = "spotify" if provider == "spotify" else "spotifyScrapper"
        module = import_module(f"backend.{domain}.framework.download.{domain}Download")
        monkeypatch.setattr(module, "MEDIA_PATH", str(tmp_path / "scratch"))
        access = import_module(f"backend.{domain}.access.{domain}Access")
        clazz = (
            access.SpotifyAccess
            if provider == "spotify"
            else access.SpotifyScrapperAccess
        )
        monkeypatch.setattr(
            clazz,
            "get_artists_from_track_row_async",
            AsyncMock(return_value=AResult.ok(result=[])),
        )
        task = (
            module.SpotifyDownload
            if provider == "spotify"
            else module.SpotifyScrapperDownload
        )(**common, track_spotify_id=201, download_url=None)
    elif provider == "youtube_music":
        module = import_module(
            "backend.youtubeMusic.framework.download.youtubeMusicDownload"
        )
        monkeypatch.setattr(module, "MEDIA_PATH", str(tmp_path / "scratch"))
        task = module.YoutubeMusicDownload(
            **common,
            track_id=201,
            youtube_id=values["youtube_id"],
            download_url="https://youtube.com/watch?v=test",
        )
    else:
        module = import_module("backend.youtube.framework.download.youtubeDownload")
        monkeypatch.setattr(module, "MEDIA_PATH", str(tmp_path / "scratch"))
        task = module.YoutubeDownload(
            **common,
            youtube_url="https://youtube.com/watch?v=test",
            youtube_video_id=values["youtube_id"],
            video_id=201,
        )
    result = await task.download_method_async(session=database)
    assert result.is_ok(), result.info()
    await database.commit()
    stored_id = await database.scalar(
        select(track_table.c.storage_object_id).where(track_table.c.id == 201)
    )
    assert stored_id is not None
    obj = await database.get(StorageObjectRow, stored_id)
    assert obj is not None
    streamed = await Storage.stream_async(storage_object=obj)
    assert streamed.is_ok() and await response_bytes(streamed.result()) == expected
    if provider in ["spotify", "spotify_scrapper"]:
        prefix = "spotify" if provider == "spotify" else "spotify_scrapper"
        route = f"/{prefix}/audio/{values['spotify_id']}"
    elif provider == "youtube_music":
        route = f"/youtube-music/audio/{provider}-201"
    else:
        route = f"/youtube/video/{values['youtube_id']}/stream"
    response = await api.get(route, headers={"Range": "bytes=0-1"})
    assert response.status_code == 206, response.text
    assert response.content == expected[:2]
    head = await api.head(route)
    assert head.status_code == 200 and head.content == b""
    assert int(head.headers["content-length"]) == len(expected)


async def test_nested_rollback_cleans_only_its_upload_and_outer_rollback_cleans_released_savepoint(
    database: AsyncSession, silo: S3Client, tmp_path: Path
) -> None:
    source = tmp_path / "nested.mp3"
    source.write_bytes(b"nested transaction")
    parent = await Storage.upload_file_async(session=database, path=str(source))
    assert parent.is_ok()
    parent_key = parent.result().key
    nested = await database.begin_nested()
    child = await Storage.upload_file_async(session=database, path=str(source))
    assert child.is_ok()
    child_key = child.result().key
    await nested.rollback()
    with pytest.raises(silo.exceptions.ClientError):
        silo.head_object(Bucket=constants.S3_BUCKET, Key=child_key)
    assert (
        silo.head_object(Bucket=constants.S3_BUCKET, Key=parent_key)["ContentLength"]
        > 0
    )
    async with database.begin_nested():
        released = await Storage.upload_file_async(session=database, path=str(source))
        assert released.is_ok()
        released_key = released.result().key
    await database.rollback()
    for key in [parent_key, released_key]:
        with pytest.raises(silo.exceptions.ClientError):
            silo.head_object(Bucket=constants.S3_BUCKET, Key=key)


async def test_profile_image_upload_validates_bytes_and_links_storage(
    database: AsyncSession, silo: S3Client, media_files: tuple[Path, Path, Path]
) -> None:
    from backend.core.framework.profile import Profile

    invalid = await Profile.upload_image_async(
        session=database, user_id=1, data=b"not an image"
    )
    assert invalid.code() == AResultCode.BAD_REQUEST
    image = await Profile.upload_image_async(
        session=database, user_id=1, data=media_files[2].read_bytes()
    )
    assert image.is_ok(), image.info()
    await database.commit()
    user = await database.get(UserRow, 1)
    assert (
        user is not None
        and user.image is not None
        and user.image.storage_object is not None
    )
    assert user.image_id == image.result().id
    assert user.image.storage_object_id
    stream = await Storage.stream_async(storage_object=user.image.storage_object)
    assert stream.is_ok() and (await response_bytes(stream.result())).startswith(
        b"\xff\xd8"
    )


async def test_storage_audit_reports_missing_orphaned_and_wrong_size_objects_without_deletion(
    database: AsyncSession, silo: S3Client, tmp_path: Path
) -> None:
    from backend.core.framework.storageAudit import StorageAudit

    source = tmp_path / "audit.mp3"
    source.write_bytes(b"audit")
    stored = await Storage.upload_file_async(session=database, path=str(source))
    assert stored.is_ok()
    obj = stored.result()
    key = obj.key
    public_id = obj.public_id
    await database.commit()
    silo.put_object(Bucket=constants.S3_BUCKET, Key="orphan.mp3", Body=b"orphan")
    silo.put_object(Bucket=constants.S3_BUCKET, Key=key, Body=b"wrong size")
    report = await StorageAudit.inspect_async(session=database)
    assert report.is_ok()
    assert report.result().unregisteredKeys == ["orphan.mp3"]
    assert report.result().sizeMismatchKeys == [key]
    assert report.result().unreferencedPublicIds == [public_id]
    silo.delete_object(Bucket=constants.S3_BUCKET, Key=key)
    report = await StorageAudit.inspect_async(session=database)
    assert report.is_ok() and report.result().missingKeys == [key]
    assert (
        silo.head_object(Bucket=constants.S3_BUCKET, Key="orphan.mp3")["ContentLength"]
        == 6
    )


async def test_expired_signed_url_is_rejected(
    database: AsyncSession,
    silo: S3Client,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import asyncio

    source = tmp_path / "expires.mp3"
    source.write_bytes(b"expiring object")
    stored = await Storage.upload_file_async(session=database, path=str(source))
    assert stored.is_ok()
    await database.commit()
    monkeypatch.setattr(constants, "S3_PRESIGNED_URL_EXPIRES", 1)
    url = Storage.get_object_url(storage_object=stored.result())
    await asyncio.sleep(2)
    async with httpx.AsyncClient(trust_env=False) as client:
        response = await client.get(url)
    assert response.status_code == 403
