"""Synthetic PostgreSQL benchmark; seed data and transactions are always rolled back.

Run from the repository root against a migrated development database:
DOWNLOAD_BENCHMARK_DATABASE_URL=postgresql+asyncpg://... PYTHONPATH=. python backend/tests/performance/download_browse_benchmark.py
"""

import asyncio, json, time, uuid, os
from pathlib import Path

DATABASE_URL = os.environ.get("DOWNLOAD_BENCHMARK_DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit(
        "Set DOWNLOAD_BENCHMARK_DATABASE_URL to a migrated development database"
    )
# Use the hermetic test configuration, never deployment credentials or services.
import conftest
from datetime import datetime, timezone, timedelta
from sqlalchemy import insert, select, func, event
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.downloadBrowseAccess import DownloadBrowseAccess
from backend.core.framework.downloader.downloadBrowser import DownloadBrowser
from backend.core.framework.downloader.downloader import Downloader
from backend.core.framework import providers


async def main():
    engine = create_async_engine(DATABASE_URL)
    queries = []

    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def count(*args):
        queries.append(args[2])

    async with engine.connect() as connection:
        outer = await connection.begin()
        async with async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )() as session:
            prefix = "browse-" + uuid.uuid4().hex[:12]
            image_id = await session.scalar(
                select(shared_metadata.tables["core.image"].c.id).limit(1)
            )
            user_id = await session.scalar(
                select(shared_metadata.tables["core.user"].c.id).limit(1)
            )
            album_id = (
                await session.execute(
                    insert(CoreMediaRow)
                    .values(
                        public_id=prefix + "-album", provider_id=2, media_type_key=2
                    )
                    .returning(CoreMediaRow.id)
                )
            ).scalar_one()
            await session.execute(
                insert(shared_metadata.tables["spotify.album"]).values(
                    id=album_id,
                    spotify_id=prefix,
                    name="Benchmark album",
                    image_id=image_id,
                    release_date="2026-10-21",
                    popularity=0,
                    disc_count=1,
                )
            )
            media_ids = list(
                (
                    await session.execute(
                        insert(CoreMediaRow).returning(CoreMediaRow.id),
                        [
                            dict(
                                public_id=f"{prefix}-song-{i}",
                                provider_id=2,
                                media_type_key=4,
                            )
                            for i in range(10000)
                        ],
                    )
                ).scalars()
            )
            await session.execute(
                insert(shared_metadata.tables["spotify.track"]),
                [
                    dict(
                        id=mid,
                        spotify_id=f"{prefix}-track-{i}",
                        name=f"Benchmark song {i}",
                        duration_ms=180000,
                        track_number=i + 1,
                        disc_number=1,
                        album_id=album_id,
                        isrc=f"{prefix}-{i}",
                    )
                    for i, mid in enumerate(media_ids)
                ],
            )
            now = datetime.now(timezone.utc)
            group_ids = list(
                (
                    await session.execute(
                        insert(DownloadGroupRow).returning(DownloadGroupRow.id),
                        [
                            dict(
                                public_id=f"{prefix}-group-{i}",
                                user_id=user_id,
                                title=f"Benchmark group {i}",
                                date_started=now - timedelta(seconds=i),
                                source_public_id=prefix + "-album",
                            )
                            for i in range(200)
                        ],
                    )
                ).scalars()
            )
            download_ids = list(
                (
                    await session.execute(
                        insert(DownloadRow).returning(DownloadRow.id),
                        [
                            dict(
                                public_id=f"{prefix}-download-{i}",
                                download_group_id=group_ids[i // 50],
                                media_id=mid,
                                status_key=3 if i % 5 else 4,
                                date_started=now,
                                date_ended=now,
                            )
                            for i, mid in enumerate(media_ids)
                        ],
                    )
                ).scalars()
            )
            for step in range(20):
                await session.execute(
                    insert(DownloadStatusRow),
                    [
                        dict(
                            download_id=did,
                            completed=float(step * 5),
                            message="Benchmark",
                        )
                        for did in download_ids
                    ],
                )
            await session.flush()
            for label, call in [
                (
                    "previous_all_history",
                    lambda: Downloader.get_downloads_async(
                        session=session, user_id=user_id
                    ),
                ),
                (
                    "paginated_first_page",
                    lambda: DownloadBrowser.page_async(
                        session=session,
                        user_id=user_id,
                        page=0,
                        status="all",
                        kind="all",
                        query="",
                    ),
                ),
                (
                    "paginated_failed_albums",
                    lambda: DownloadBrowser.page_async(
                        session=session,
                        user_id=user_id,
                        page=0,
                        status="failed",
                        kind="album",
                        query="Benchmark song 7",
                    ),
                ),
                (
                    "expanded_group",
                    lambda: DownloadBrowser.items_async(
                        session=session,
                        user_id=user_id,
                        public_id=prefix + "-group-0",
                        offset=0,
                        status="all",
                    ),
                ),
            ]:
                queries.clear()
                start = time.perf_counter()
                result = await call()
                elapsed = (time.perf_counter() - start) * 1000
                assert result.is_ok(), result.message()
                data = result.result()
                raw = data.model_dump_json()
                group_list = getattr(data, "groups", getattr(data, "downloads", []))
                count_items = (
                    sum(len(g.items) for g in group_list)
                    if group_list
                    else len(getattr(data, "items", []))
                )
                print(
                    json.dumps(
                        dict(
                            case=label,
                            ms=round(elapsed, 1),
                            queries=len(queries),
                            bytes=len(raw.encode()),
                            groups=len(group_list),
                            items=count_items,
                        )
                    )
                )
                if label == "paginated_first_page":
                    assert (
                        len(data.groups) == 12
                        and count_items == 72
                        and data.totals.total == 10000
                        and data.hasMore
                    )
                    assert (
                        data.groups[0].sourceType == "album"
                        and data.groups[0].imageUrl
                        and data.groups[0].canManage
                    )
                if label == "paginated_failed_albums":
                    assert all(
                        g.fail == 10
                        and all("Benchmark song 7" in item.name for item in g.items)
                        for g in data.groups
                    )
                if label == "expanded_group":
                    assert len(data.items) == 48 and data.hasMore and data.total == 50
            # Exercise the batched SQL used by whole-group file actions as well.
            tracks = shared_metadata.tables["spotify.track"]
            await session.execute(
                tracks.update()
                .where(tracks.c.id.in_(media_ids[:2]))
                .values(path="benchmark.mp3")
            )
            cleared = await DownloadBrowseAccess.clear_files_async(
                session=session, media_ids=media_ids[:2]
            )
            assert cleared.is_ok() and cleared.result() == [
                "benchmark.mp3",
                "benchmark.mp3",
            ]
            remaining_paths = (
                (
                    await session.execute(
                        select(tracks.c.path).where(tracks.c.id.in_(media_ids[:2]))
                    )
                )
                .scalars()
                .all()
            )
            assert all(path is None for path in remaining_paths)
            group_row = (
                await session.execute(
                    select(DownloadGroupRow).where(DownloadGroupRow.id == group_ids[0])
                )
            ).scalar_one()
            reset = await DownloadBrowseAccess.reset_group_async(
                session=session, group=group_row, download_ids=download_ids[:50]
            )
            assert reset.is_ok()
            active = await DownloadBrowseAccess.has_other_active_async(
                session=session, group_id=group_ids[0], media_ids=media_ids[:50]
            )
            assert active.is_ok() and not active.result()
            # Re-import an old source: one real file is reused, one missing file is queued.
            import tempfile
            from unittest.mock import patch
            from backend.core.access.downloadAccess import DownloadAccess
            from backend.utils import downloadFiles
            from backend.core.framework.downloader import downloader

            with tempfile.TemporaryDirectory(prefix="rockit-reuse-") as folder:
                Path(folder, "already-downloaded.mp3").write_bytes(b"existing audio")
                await session.execute(
                    tracks.update()
                    .where(tracks.c.id == media_ids[0])
                    .values(path="already-downloaded.mp3")
                )
                await session.execute(
                    tracks.update()
                    .where(tracks.c.id == media_ids[1])
                    .values(path="missing.mp3")
                )
                imported = await DownloadAccess.create_download_group(
                    session=session,
                    user_id=user_id,
                    title="Reimported album",
                    source_public_id=prefix + "-album",
                )
                assert imported.is_ok()
                queued = []
                with patch.object(downloadFiles, "MEDIA_PATH", folder), patch.object(
                    providers, "find_media_provider", return_value=object()
                ), patch.object(
                    downloader.downloads_manager,
                    "add_download",
                    side_effect=queued.append,
                ):
                    started = await Downloader._queue_downloads_async(
                        session=session,
                        public_ids=[f"{prefix}-song-0", f"{prefix}-song-1"],
                        group=imported.result(),
                        user_id=user_id,
                    )
                    assert started.is_ok(), started.message()
                reused_rows = (
                    (
                        await session.execute(
                            select(DownloadRow)
                            .where(
                                DownloadRow.download_group_id == imported.result().id
                            )
                            .order_by(DownloadRow.id)
                        )
                    )
                    .scalars()
                    .all()
                )
                assert [row.status_key for row in reused_rows] == [3, 1]
                assert [task.public_id for task in queued] == [f"{prefix}-song-1"]
                assert imported.result().source_public_id == prefix + "-album"
                assert (
                    imported.result().success == 1
                    and imported.result().date_ended is None
                )
                assert (
                    Path(folder, "already-downloaded.mp3").read_bytes()
                    == b"existing audio"
                )
                print(
                    "Reimport verified: existing file preserved, missing track queued, original source retained."
                )
                Path(folder, "missing.mp3").write_bytes(b"now downloaded")
                complete = await DownloadAccess.create_download_group(
                    session=session,
                    user_id=user_id,
                    title="Fully downloaded album",
                    source_public_id=prefix + "-album",
                )
                assert complete.is_ok()
                queued.clear()
                with patch.object(downloadFiles, "MEDIA_PATH", folder), patch.object(
                    downloader.downloads_manager,
                    "add_download",
                    side_effect=queued.append,
                ):
                    reused = await Downloader._queue_downloads_async(
                        session=session,
                        public_ids=[f"{prefix}-song-0", f"{prefix}-song-1"],
                        group=complete.result(),
                        user_id=user_id,
                    )
                assert reused.is_ok(), reused.message()
                assert queued == []
                assert (
                    complete.result().status_key == 3
                    and complete.result().success == 2
                    and complete.result().date_ended is not None
                )
                print(
                    "Fully downloaded source verified: completed immediately, no download workers queued."
                )
            denied = await DownloadBrowser.items_async(
                session=session,
                user_id=-1,
                public_id=prefix + "-group-0",
                offset=0,
                status="all",
            )
            assert denied.is_not_ok()
        await outer.rollback()
    await engine.dispose()
    print("All fixtures rolled back.")


asyncio.run(main())
