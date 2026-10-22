"""Local files remain accessible through declarations even with providers disabled."""

from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.downloadBrowseAccess import DownloadBrowseAccess
from backend.core.access.downloadReuseAccess import DownloadReuseAccess
from backend.core.access import downloadZipAccess
from backend.core.access.downloadZipAccess import DownloadZipAccess

pytestmark = pytest.mark.integration


async def test_disabled_provider_storage_supports_browse_reuse_zip_and_clear(
    database: AsyncSession, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    session = database
    tables = shared_metadata.tables
    # This arbitrary name is not a registered framework provider. Local access
    # must depend on the provider's storage declaration, not its display name.
    await session.execute(
        insert(tables["core.provider"]),
        dict(id=99, name="Renamed source", module="source", disabled=True),
    )
    await session.execute(
        insert(tables["core.download_status_enum"]),
        [dict(key=i, value=str(i)) for i in range(1, 5)],
    )
    await session.execute(
        insert(tables["core.media"]),
        [
            dict(id=100, public_id="channel", provider_id=99, media_type_key=1),
            dict(id=101, public_id="video", provider_id=99, media_type_key=5),
            dict(id=102, public_id="upload", provider_id=2, media_type_key=4),
        ],
    )
    await session.execute(
        insert(tables["youtube.channel"]),
        dict(id=100, youtube_id="channel", name="Channel", image_id=1),
    )
    await session.execute(
        insert(tables["youtube.video"]),
        dict(
            id=101,
            youtube_id="external-video",
            name="Video title",
            image_id=1,
            channel_id=100,
            youtube_url="https://example.test/video",
            video_path="video.mp4",
        ),
    )
    await session.execute(
        insert(tables["rockit.song"]),
        dict(
            id=102,
            name="Upload",
            duration_ms=1000,
            image_id=1,
            file_path="upload.mp3",
            disc_number=1,
            track_number=1,
        ),
    )
    now = datetime.now(timezone.utc)
    await session.execute(
        insert(tables["core.download_group"]),
        dict(
            id=100,
            public_id="group",
            user_id=1,
            title="Video group",
            date_started=now,
            source_public_id="video",
        ),
    )
    await session.execute(
        insert(tables["core.download"]),
        dict(
            public_id="download",
            download_group_id=100,
            media_id=101,
            date_started=now,
            status_key=3,
        ),
    )
    await session.commit()

    groups = await DownloadBrowseAccess.groups_async(session, 1, 0, "all", "all", "")
    assert groups.is_ok(), groups.info()
    assert groups.result()[0]["name"] == "Video title"
    assert groups.result()[0]["external_id"] == "external-video"
    assert groups.result()[0]["manageable"] is True
    searched = await DownloadBrowseAccess.groups_async(
        session, 1, 0, "all", "all", "Video title"
    )
    assert searched.is_ok(), searched.info()
    assert len(searched.result()) == 1
    candidates = await DownloadReuseAccess.candidates_async(
        session, ["video", "upload"]
    )
    assert candidates.is_ok(), candidates.info()
    assert {item.path for item in candidates.result()} == {"video.mp4", "upload.mp3"}

    monkeypatch.setattr(downloadZipAccess, "MEDIA_PATH", str(tmp_path))
    (tmp_path / "video.mp4").write_bytes(b"video")
    (tmp_path / "upload.mp3").write_bytes(b"audio")
    files = await DownloadZipAccess.get_file_paths_async(session, ["video", "upload"])
    assert files.is_ok(), files.info()
    assert set(files.result()) == {
        ("Video title", str(tmp_path / "video.mp4")),
        ("Upload", str(tmp_path / "upload.mp3")),
    }
    cleared = await DownloadBrowseAccess.clear_files_async(session, [101, 102])
    assert cleared.is_ok(), cleared.info()
    assert cleared.result() == ["video.mp4"]
    assert await session.scalar(select(tables["youtube.video"].c.video_path)) is None
    assert (
        await session.scalar(select(tables["rockit.song"].c.file_path)) == "upload.mp3"
    )
