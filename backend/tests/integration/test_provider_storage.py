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


@pytest.mark.parametrize("schema", ["spotify", "spotify_scrapper", "youtube_music"])
async def test_track_storage_preserves_images_and_batch_mutation(
    database: AsyncSession, schema: str
) -> None:
    """Exercise each track projection and mutation against its real schema."""
    from backend.core.access.providerStorage import provider_storage

    tables = shared_metadata.tables
    music = schema == "youtube_music"
    external_key, name_key = (
        ("youtube_id", "title") if music else ("spotify_id", "name")
    )
    await database.execute(
        insert(tables["core.media"]),
        [
            dict(id=200, public_id="album", provider_id=2, media_type_key=2),
            dict(id=201, public_id="track", provider_id=2, media_type_key=4),
            dict(id=202, public_id="untouched", provider_id=2, media_type_key=4),
        ],
    )
    album = dict(id=200, image_id=1, release_date="2026")
    album.update({external_key: "external-album", name_key: "Album"})
    if not music:
        album.update(popularity=1, disc_count=1)
    await database.execute(insert(tables[f"{schema}.album"]), album)
    tracks: list[dict[str, int | str]] = []
    for media_id in (201, 202):
        track = dict(
            id=media_id,
            duration_ms=1000,
            track_number=1,
            disc_number=1,
            album_id=200,
            path=f"{media_id}.mp3",
        )
        track.update(
            {external_key: f"external-{media_id}", name_key: f"Track {media_id}"}
        )
        if music:
            track["image_id"] = 1
        elif schema == "spotify":
            track["isrc"] = "test"
        tracks.append(track)
    await database.execute(insert(tables[f"{schema}.track"]), tracks)
    await database.commit()

    for images in (True, False):
        metadata = provider_storage.metadata(with_images=images)
        row = (
            (await database.execute(select(metadata).where(metadata.c.id == 201)))
            .mappings()
            .one()
        )
        assert row["name"] == "Track 201"
        assert row["image_id"] == (1 if images else None)
        assert row["external_id"] == "external-201"
        assert row["manageable"] is True
    cleared = await DownloadBrowseAccess.clear_files_async(database, [201])
    assert cleared.is_ok(), cleared.info()
    assert cleared.result() == ["201.mp3"]
    # The provider participates in the caller's transaction; it cannot commit it.
    assert (
        await database.scalar(
            select(tables[f"{schema}.track"].c.path).where(
                tables[f"{schema}.track"].c.id == 201
            )
        )
        is None
    )
    await database.rollback()
    rows = (
        (await database.execute(select(tables[f"{schema}.track"].c.path)))
        .scalars()
        .all()
    )
    assert set(rows) == {"201.mp3", "202.mp3"}
