from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.downloadReuseAccess import DownloadReuseAccess
from backend.core.framework import providers
from backend.utils import downloadFiles
from backend.core.framework.downloader import downloader
from backend.utils.downloadFiles import DownloadFiles
from backend.core.framework.downloader.downloader import Downloader
from backend.core.framework.downloader.deferredDownload import DeferredDownload
from backend.core.framework.models.downloadCandidate import DownloadCandidate

pytestmark = pytest.mark.unit


def ok(value):
    return AResult(code=AResultCode.OK, message="OK", result=value)


@pytest.mark.parametrize(
    "case",
    ["existing", "missing", "empty", "directory", "no_path", "outside", "invalid"],
)
async def test_file_reuse_requires_a_real_nonempty_file(tmp_path, monkeypatch, case):
    root = tmp_path / "media"
    root.mkdir()
    monkeypatch.setattr(downloadFiles, "MEDIA_PATH", str(root))
    path = "song.mp3"
    if case == "existing":
        (root / path).write_bytes(b"audio")
    elif case == "empty":
        (root / path).touch()
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


@pytest.mark.parametrize("reused", [set(), {1}, {1, 2}])
async def test_new_source_group_only_queues_missing_files(monkeypatch, reused):
    candidates = [
        DownloadCandidate(id=1, public_id="a", provider_id=2, path="a.mp3"),
        DownloadCandidate(id=2, public_id="b", provider_id=2, path="b.mp3"),
    ]
    load = AsyncMock(return_value=ok(candidates))
    create = AsyncMock(
        return_value=ok(
            [
                SimpleNamespace(
                    id=10 + i, media_id=c.id, status_key=3 if c.id in reused else 1
                )
                for i, c in enumerate(candidates)
            ]
        )
    )
    queue = Mock()
    monkeypatch.setattr(DownloadReuseAccess, "candidates_async", load)
    monkeypatch.setattr(DownloadReuseAccess, "create_group_items_async", create)
    monkeypatch.setattr(
        DownloadFiles, "existing_ids_async", AsyncMock(return_value=reused)
    )
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=Mock()))
    monkeypatch.setattr(downloader.downloads_manager, "add_download", queue)
    group = SimpleNamespace(id=5, public_id="playlist")
    session = AsyncMock(spec=AsyncSession)
    result = await Downloader._queue_downloads_async(
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


@pytest.mark.parametrize("reused", [set(), {1}, {1, 2}])
async def test_batch_records_immediately_reflect_reused_files(reused):
    candidates = [
        DownloadCandidate(id=1, public_id="a", provider_id=2, path="a.mp3"),
        DownloadCandidate(id=2, public_id="b", provider_id=2, path="b.mp3"),
    ]
    group = SimpleNamespace(id=5)
    session = AsyncMock(spec=AsyncSession)
    result = await DownloadReuseAccess.create_group_items_async(
        session=session, group=group, candidates=candidates, existing_ids=reused
    )
    assert result.is_ok()
    rows = result.result()
    assert [row.status_key for row in rows] == [
        3 if c.id in reused else 1 for c in candidates
    ]
    assert all((row.date_ended is not None) == (row.media_id in reused) for row in rows)
    assert group.success == len(reused) and group.fail == 0
    assert group.status_key == (3 if len(reused) == 2 else 1)
    assert (group.date_ended is not None) == (len(reused) == 2)
    session.add_all.assert_called_once_with(rows)
    session.flush.assert_awaited_once()


async def test_missing_metadata_does_not_silently_create_an_incomplete_playlist(
    monkeypatch,
):
    monkeypatch.setattr(
        DownloadReuseAccess, "candidates_async", AsyncMock(return_value=ok([]))
    )
    queue = Mock()
    monkeypatch.setattr(downloader.downloads_manager, "add_download", queue)
    result = await Downloader._queue_downloads_async(
        session=AsyncMock(spec=AsyncSession),
        public_ids=["missing"],
        group=SimpleNamespace(id=5),
        user_id=7,
    )
    assert result.code() == AResultCode.NOT_FOUND
    queue.assert_not_called()


async def test_commit_failure_does_not_make_downloads_runnable(monkeypatch):
    candidate = DownloadCandidate(id=1, public_id="song", provider_id=2, path=None)
    monkeypatch.setattr(
        DownloadReuseAccess, "candidates_async", AsyncMock(return_value=ok([candidate]))
    )
    monkeypatch.setattr(
        DownloadReuseAccess,
        "create_group_items_async",
        AsyncMock(return_value=ok([SimpleNamespace(id=10, media_id=1, status_key=1)])),
    )
    monkeypatch.setattr(
        DownloadFiles, "existing_ids_async", AsyncMock(return_value=set())
    )
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=Mock()))
    queue = Mock()
    monkeypatch.setattr(downloader.downloads_manager, "add_download", queue)
    session = AsyncMock(spec=AsyncSession)
    session.commit.side_effect = RuntimeError("Database unavailable")
    result = await Downloader._queue_downloads_async(
        session=session, public_ids=["song"], group=SimpleNamespace(id=5), user_id=7
    )
    assert result.is_not_ok()
    queue.assert_not_called()
    session.rollback.assert_awaited_once()


async def test_worker_rechecks_file_before_contacting_provider(monkeypatch):
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
    monkeypatch.setattr(
        DownloadFiles, "existing_ids_async", AsyncMock(return_value={1})
    )
    provider = Mock()
    monkeypatch.setattr(providers, "find_media_provider", provider)
    task = DeferredDownload(
        public_id="song", download_id=10, download_group_id=5, user_id=7
    )
    task.provider_id = 2
    result = await task.download_method_async(session=AsyncMock(spec=AsyncSession))
    assert result.is_ok()
    assert task.title == "Song title" and task.artist == "Spotify"
    provider.assert_not_called()


async def test_candidate_query_supports_every_provider_schema_without_hydration():
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
    result = await DownloadReuseAccess.candidates_async(
        session=session, public_ids=["song"]
    )
    assert result.is_ok()
    assert result.result()[0].name == "Song"
    assert result.result()[0].path == "song.mp3"
    # Compile against the actual provider schemas, including YouTube Music's title column.
    statement = session.execute.call_args.args[0]
    statement.compile(dialect=postgresql.dialect())
    session.execute.assert_awaited_once()
