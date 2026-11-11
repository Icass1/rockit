from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import TypeVar
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.downloadGroup import DownloadGroupRow
from core.access.downloadReuseAccess import DownloadReuseAccess
from core.framework import providers
from core.framework.downloader import downloads_manager
from core.framework.downloader.deferredDownload import DeferredDownload
from core.framework.downloader.downloader import Downloader
from core.framework.models.downloadCandidate import DownloadCandidate
from core.utils.downloadFiles import DownloadFiles
from result import Result, ResultCode
from tests.fake_object_store import FakeObjectStore

T = TypeVar("T")

pytestmark = pytest.mark.unit


def ok[T](value: T) -> Result[T]:
    return Result(code=ResultCode.OK, message="OK", result=value)


def make_group() -> DownloadGroupRow:
    group = DownloadGroupRow(
        public_id="playlist",
        user_id=7,
        title="Playlist",
        date_started=datetime.now(UTC),
    )
    group.id = 5
    return group


@pytest.mark.parametrize(
    "case",
    ["existing", "missing", "empty", "directory", "no_path", "outside", "invalid"],
)
async def test_file_reuse_requires_a_real_nonempty_file(
    tmp_path: Path, object_store: FakeObjectStore, case: str
) -> None:
    root = tmp_path / "media"
    root.mkdir()

    path: str | None = "song.mp3"
    if case == "existing":
        object_store.objects[path] = b"audio"
    elif case == "empty":
        object_store.objects[path] = b""
    elif case == "directory":
        (root / path).mkdir()
    elif case == "no_path":
        path = None
    elif case == "outside":
        outside = tmp_path / "outside.mp3"
        outside.write_bytes(b"audio")
        path = str(outside)
    elif case == "invalid":
        path = "\x00"
    result = await DownloadFiles.existing_ids_async(
        candidates=[DownloadCandidate(id=1, public_id="song", provider_id=2, path=path)]
    )
    assert result == ({1} if case == "existing" else set())


@pytest.mark.parametrize("reused", [set[int](), {1}, {1, 2}])
async def test_new_source_group_only_queues_missing_files(
    monkeypatch: pytest.MonkeyPatch, reused: set[int]
) -> None:
    candidates = [
        DownloadCandidate(id=1, public_id="a", provider_id=2, path="a.mp3"),
        DownloadCandidate(id=2, public_id="b", provider_id=2, path="b.mp3"),
    ]
    load = AsyncMock(return_value=ok(candidates))
    create = AsyncMock(
        return_value=ok(
            [
                SimpleNamespace(id=10 + i, media_id=c.id, status_key=3 if c.id in reused else 1)
                for i, c in enumerate(candidates)
            ]
        )
    )
    queue = Mock()
    monkeypatch.setattr(DownloadReuseAccess, "candidates_async", load)
    monkeypatch.setattr(DownloadReuseAccess, "create_group_items_async", create)
    monkeypatch.setattr(DownloadFiles, "existing_ids_async", AsyncMock(return_value=reused))
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=Mock()))
    monkeypatch.setattr(downloads_manager, "add_download", queue)
    group = make_group()
    session = AsyncMock(spec=AsyncSession)
    result = await Downloader._queue_downloads_async(  # pyright: ignore[reportPrivateUsage]
        session=session, public_ids=["a", "b", "a"], group=group, user_id=7
    )
    assert result.is_ok()
    load.assert_awaited_once_with(session=session, public_ids=["a", "b"])
    create.assert_awaited_once_with(
        session=session, group=group, candidates=candidates, existing_ids=reused
    )
    tasks = [call.args[0] for call in queue.call_args_list]
    assert [task.public_id for task in tasks] == [
        c.public_id for c in candidates if c.id not in reused
    ]
    assert all(task.download_group_id == 5 and task.user_id == 7 for task in tasks)
    assert all(isinstance(task, DeferredDownload) for task in tasks)
    session.commit.assert_awaited_once()


@pytest.mark.parametrize("reused", [set[int](), {1}, {1, 2}])
async def test_batch_records_immediately_reflect_reused_files(reused: set[int]) -> None:
    candidates = [
        DownloadCandidate(id=1, public_id="a", provider_id=2, path="a.mp3"),
        DownloadCandidate(id=2, public_id="b", provider_id=2, path="b.mp3"),
    ]
    group = make_group()
    session = AsyncMock(spec=AsyncSession)
    result = await DownloadReuseAccess.create_group_items_async(
        session=session, group=group, candidates=candidates, existing_ids=reused
    )
    assert result.is_ok()
    rows = result.result()
    assert [row.status_key for row in rows] == [3 if c.id in reused else 1 for c in candidates]
    assert all((row.date_ended is not None) == (row.media_id in reused) for row in rows)
    assert group.success == len(reused) and group.fail == 0
    assert group.status_key == (3 if len(reused) == 2 else 1)
    assert (group.date_ended is not None) == (len(reused) == 2)
    session.add_all.assert_called_once_with(rows)
    session.flush.assert_awaited_once()


async def test_missing_metadata_does_not_silently_create_an_incomplete_playlist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(DownloadReuseAccess, "candidates_async", AsyncMock(return_value=ok([])))
    queue = Mock()
    monkeypatch.setattr(downloads_manager, "add_download", queue)
    result = await Downloader._queue_downloads_async(  # pyright: ignore[reportPrivateUsage]
        session=AsyncMock(spec=AsyncSession),
        public_ids=["missing"],
        group=make_group(),
        user_id=7,
    )
    assert result.code() == ResultCode.NOT_FOUND
    queue.assert_not_called()


async def test_commit_failure_does_not_make_downloads_runnable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    candidate = DownloadCandidate(id=1, public_id="song", provider_id=2, path=None)
    monkeypatch.setattr(
        DownloadReuseAccess, "candidates_async", AsyncMock(return_value=ok([candidate]))
    )
    monkeypatch.setattr(
        DownloadReuseAccess,
        "create_group_items_async",
        AsyncMock(return_value=ok([SimpleNamespace(id=10, media_id=1, status_key=1)])),
    )
    monkeypatch.setattr(DownloadFiles, "existing_ids_async", AsyncMock(return_value=set()))
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=Mock()))
    queue = Mock()
    monkeypatch.setattr(downloads_manager, "add_download", queue)
    session = AsyncMock(spec=AsyncSession)
    session.commit.side_effect = RuntimeError("Database unavailable")
    result = await Downloader._queue_downloads_async(  # pyright: ignore[reportPrivateUsage]
        session=session,
        public_ids=["song"],
        group=make_group(),
        user_id=7,
    )
    assert result.is_not_ok()
    queue.assert_not_called()
    session.rollback.assert_awaited_once()


async def test_worker_rechecks_file_before_contacting_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        DownloadReuseAccess,
        "candidates_async",
        AsyncMock(
            return_value=ok(
                [
                    DownloadCandidate(
                        id=1,
                        public_id="song",
                        provider_id=2,
                        path="song.mp3",
                        name="Song title",
                        provider="Spotify",
                    )
                ]
            )
        ),
    )
    monkeypatch.setattr(DownloadFiles, "existing_ids_async", AsyncMock(return_value={1}))
    provider = Mock()
    monkeypatch.setattr(providers, "find_media_provider", provider)
    task = DeferredDownload(public_id="song", download_id=10, download_group_id=5, user_id=7)
    task.provider_id = 2
    result = await task.download_method_async(session=AsyncMock(spec=AsyncSession))
    assert result.is_ok()
    assert task.title == "Song title" and task.artist == "Spotify"
    provider.assert_not_called()


async def test_candidate_query_supports_every_provider_schema_without_hydration() -> None:
    from sqlalchemy.dialects import postgresql

    row = SimpleNamespace(
        id=1,
        public_id="song",
        provider_id=2,
        path="song.mp3",
        name="Song",
        provider="Spotify",
    )
    session = AsyncMock(spec=AsyncSession)
    session.execute.return_value = Mock(all=Mock(return_value=[row]))
    result = await DownloadReuseAccess.candidates_async(session=session, public_ids=["song"])
    assert result.is_ok()
    assert result.result()[0].name == "Song"
    assert result.result()[0].path == "song.mp3"
    # Compile against the actual provider schemas, including YouTube Music's title column.
    statement = session.execute.call_args.args[0]
    statement.compile(dialect=postgresql.dialect())
    session.execute.assert_awaited_once()


async def test_replacement_group_queues_existing_files_without_testing_or_deleting_them(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    candidate = DownloadCandidate(id=1, public_id="song", provider_id=2, path="old.mp3")
    monkeypatch.setattr(
        DownloadReuseAccess, "candidates_async", AsyncMock(return_value=ok([candidate]))
    )
    create = AsyncMock(return_value=ok([SimpleNamespace(id=10, media_id=1, status_key=1)]))
    monkeypatch.setattr(DownloadReuseAccess, "create_group_items_async", create)
    exists = AsyncMock(return_value={1})
    monkeypatch.setattr(DownloadFiles, "existing_ids_async", exists)
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=Mock()))
    queue = Mock()
    monkeypatch.setattr(downloads_manager, "add_download", queue)
    group = make_group()
    session = AsyncMock(spec=AsyncSession)
    result = await Downloader._queue_downloads_async(  # pyright: ignore[reportPrivateUsage]
        session=session, public_ids=["song"], group=group, user_id=7, replace_existing=True
    )
    assert result.is_ok()
    exists.assert_not_awaited()
    create.assert_awaited_once_with(
        session=session, group=group, candidates=[candidate], existing_ids=set()
    )
    queued = queue.call_args.args[0]
    assert isinstance(queued, DeferredDownload) and queued.replace_existing
    session.commit.assert_awaited_once()


@pytest.mark.parametrize("failure", [None, "download", "reference", "missing", "commit", "cleanup"])
async def test_replacement_keeps_old_file_until_new_reference_is_committed(
    monkeypatch: pytest.MonkeyPatch, object_store: FakeObjectStore, failure: str | None
) -> None:
    from core.framework.objectFiles import ObjectFiles

    old = DownloadCandidate(id=1, public_id="song", provider_id=2, path="old.mp3")
    new = DownloadCandidate(id=1, public_id="song", provider_id=2, path="new.mp3")
    load = AsyncMock(side_effect=[ok([old]), ok([old if failure == "reference" else new])])
    monkeypatch.setattr(DownloadReuseAccess, "candidates_async", load)
    object_store.objects["old.mp3"] = b"previous audio"
    current_path = "old.mp3"

    async def download(session: AsyncSession) -> ResultCode:
        assert object_store.objects[current_path] == b"previous audio"
        if failure == "download":
            return ResultCode(code=ResultCode.RATE_LIMITED, message="Provider unavailable")
        if failure != "missing":
            object_store.objects["new.mp3"] = b"replacement audio"
        return ResultCode(code=ResultCode.OK, message="OK")

    async def commit() -> None:
        nonlocal current_path
        assert object_store.objects["old.mp3"] == b"previous audio"
        assert object_store.objects["new.mp3"] == b"replacement audio"
        if failure == "commit":
            raise RuntimeError("Database unavailable")
        current_path = "new.mp3"

    async def delete(key: str) -> None:
        assert current_path == "new.mp3"
        assert key == "old.mp3"
        if failure == "cleanup":
            raise RuntimeError("Storage unavailable")
        object_store.objects.pop(key)

    delete_file = AsyncMock(side_effect=delete)
    monkeypatch.setattr(ObjectFiles, "delete_async", delete_file)
    exists = AsyncMock(return_value={1})
    monkeypatch.setattr(DownloadFiles, "existing_ids_async", exists)
    provider_task = SimpleNamespace(
        title="Song",
        artist="Artist",
        provider_id=2,
        retry_count=0,
        download_method_async=AsyncMock(side_effect=download),
    )
    provider = Mock(start_download_async=AsyncMock(return_value=ok(provider_task)))
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=provider))
    session = AsyncMock(spec=AsyncSession)
    session.commit.side_effect = commit
    task = DeferredDownload(public_id="song", download_id=10, download_group_id=5, user_id=7)
    task.provider_id = 2
    task.replace_existing = True
    task.retry_count = 2
    result = await task.download_method_async(session=session)
    exists.assert_not_awaited()
    assert provider_task.retry_count == 2
    if failure in {None, "cleanup"}:
        assert result.is_ok() and current_path == "new.mp3"
        assert object_store.objects[current_path] == b"replacement audio"
        assert ("old.mp3" in object_store.objects) == (failure == "cleanup")
        session.rollback.assert_not_awaited()
    else:
        assert result.is_not_ok() and current_path == "old.mp3"
        assert object_store.objects[current_path] == b"previous audio"
        delete_file.assert_not_awaited()
        session.rollback.assert_awaited_once()
        if failure == "download":
            assert result.code() == ResultCode.RATE_LIMITED


@pytest.mark.parametrize("status", [3, 4])
@pytest.mark.parametrize("commit_fails", [False, True])
async def test_individual_retry_preserves_file_and_queues_a_forced_worker_after_commit(
    monkeypatch: pytest.MonkeyPatch,
    status: int,
    commit_fails: bool,
    object_store: FakeObjectStore,
) -> None:
    from core.access.downloadAccess import DownloadAccess
    from core.access.mediaAccess import MediaAccess
    from core.framework.media.media import Media

    row = SimpleNamespace(id=10, media_id=1, download_group_id=5, status_key=status)
    media = SimpleNamespace(id=1, public_id="song", provider_id=2)
    monkeypatch.setattr(
        DownloadAccess, "get_download_by_media_public_id", AsyncMock(return_value=ok(row))
    )
    monkeypatch.setattr(DownloadAccess, "reset_download_for_retry", AsyncMock(return_value=ok(row)))
    monkeypatch.setattr(MediaAccess, "get_media_from_id_async", AsyncMock(return_value=ok(media)))
    delete = AsyncMock()
    monkeypatch.setattr(Media, "delete_media_file_async", delete)
    provider = Mock(start_download_async=AsyncMock())
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=provider))
    session = AsyncMock(spec=AsyncSession)
    if commit_fails:
        session.commit.side_effect = RuntimeError("Database unavailable")
    object_store.objects["old.mp3"] = b"previous audio"

    def enqueue(task: DeferredDownload) -> None:
        session.commit.assert_awaited_once()
        assert task.replace_existing
        assert task.public_id == "song" and task.provider_id == 2
        assert task.download_id == 10 and task.download_group_id == 5 and task.user_id == 7

    queue = Mock(side_effect=enqueue)
    monkeypatch.setattr(downloads_manager, "add_download", queue)
    result = await Downloader.retry_download_async(session=session, user_id=7, public_id="song")
    assert result.is_ok() == (not commit_fails)
    assert object_store.objects["old.mp3"] == b"previous audio"
    delete.assert_not_awaited()
    provider.start_download_async.assert_not_awaited()
    if commit_fails:
        queue.assert_not_called()
        session.rollback.assert_awaited_once()
    else:
        queue.assert_called_once()


@pytest.mark.parametrize("provider", ["spotify", "spotify_scrapper", "youtube", "youtube_music"])
async def test_provider_file_updates_leave_commit_to_download_worker(provider: str) -> None:
    from spotify.access.trackAccess import TrackAccess as SpotifyTrackAccess
    from spotifyScrapper.access.trackAccess import TrackAccess as ScrapperTrackAccess
    from youtube.access.videoAccess import VideoAccess
    from youtubeMusic.access.youtubeMusicAccess import YoutubeMusicAccess

    session = AsyncMock(spec=AsyncSession)
    row = SimpleNamespace(storage_object_id=1, download_url=None)
    session.execute.return_value = Mock(scalar_one_or_none=Mock(return_value=row))
    session.get.return_value = row
    if provider == "spotify":
        result = await SpotifyTrackAccess.update_track_path_async(
            session=session, track_id=1, storage_object_id=2, download_url="new-source"
        )
    elif provider == "spotify_scrapper":
        result = await ScrapperTrackAccess.update_track_path_async(
            session=session, track_id=1, storage_object_id=2, download_url="new-source"
        )
        duration = await ScrapperTrackAccess.update_track_real_duration_async(
            session=session, track_id=1, real_duration_ms=1000
        )
        assert duration.is_ok()
    elif provider == "youtube":
        result = await VideoAccess.update_video_path_async(
            session=session, video_id=1, storage_object_id=2
        )
        duration = await VideoAccess.update_video_real_duration_async(
            session=session, video_id=1, real_duration_ms=1000
        )
        assert duration.is_ok()
    else:
        result = await YoutubeMusicAccess.update_track_path_async(
            session=session, track_id=1, storage_object_id=2
        )
    assert result.is_ok() and row.storage_object_id == 2
    session.flush.assert_awaited()
    session.commit.assert_not_awaited()
