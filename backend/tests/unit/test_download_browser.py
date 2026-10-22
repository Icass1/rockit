from dataclasses import dataclass
from typing import TypeVar
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.downloadBrowseAccess import DownloadBrowseAccess
from backend.core.framework import providers
from backend.core.framework.downloader import downloadBrowser
from backend.core.framework.downloader import downloads_manager
from backend.core.framework.downloader.downloadBrowser import DownloadBrowser
from backend.core.framework.downloader.deferredDownload import DeferredDownload
from backend.core.framework.user.user import User

T = TypeVar("T")

pytestmark = pytest.mark.unit


def ok(value: T) -> AResult[T]:
    return AResult(code=AResultCode.OK, message="OK", result=value)


async def test_browse_limits_headers_and_previews_before_loading_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(timezone.utc)
    rows = [
        dict(
            id=i,
            public_id=f"group-{i}",
            title="Imported playlist",
            name="Spotify playlist",
            date_started=now,
            date_ended=now,
            source_public_id="playlist",
            total=1000,
            completed=1000,
            failed=0,
            active=0,
            matching=1000,
            manageable=True,
            external_id="spotify-playlist",
            media_type_key=3,
            provider_id=2,
            image_public_id="cover",
            provider="Spotify",
            in_library=False,
        )
        for i in range(13)
    ]
    monkeypatch.setattr(
        DownloadBrowseAccess, "groups_async", AsyncMock(return_value=ok(rows))
    )
    monkeypatch.setattr(
        DownloadBrowseAccess,
        "totals_async",
        AsyncMock(
            return_value=ok(dict(total=13000, active=0, completed=13000, failed=0))
        ),
    )
    previews = AsyncMock(return_value=ok([]))
    monkeypatch.setattr(DownloadBrowseAccess, "items_async", previews)
    provider = Mock()
    provider.get_collection_provider_url.return_value = (
        "https://open.spotify.com/playlist/spotify-playlist"
    )
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=provider))
    result = await DownloadBrowser.page_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=1,
        page=0,
        status="all",
        kind="playlist",
        query="",
    )
    assert result.is_ok()
    page = result.result()
    assert len(page.groups) == 12 and page.hasMore
    assert page.totals.total == 13000
    assert previews.call_args.kwargs["group_ids"] == list(range(12))
    assert previews.call_args.kwargs["limit"] == 6
    group = page.groups[0]
    assert group.name == "Spotify playlist"
    assert group.sourceType == "playlist" and group.sourceUrl == "/playlist/playlist"
    assert group.providerUrl == "https://open.spotify.com/playlist/spotify-playlist"
    assert group.imageUrl is not None
    assert group.imageUrl.endswith("/media/image/cover")
    assert group.total == 1000 and group.hasMoreItems and group.canManage


async def test_group_item_page_checks_ownership_before_loading_tracks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        DownloadAccess,
        "get_download_group_by_public_id",
        AsyncMock(
            return_value=AResult(code=AResultCode.NOT_FOUND, message="Not found")
        ),
    )
    tracks = AsyncMock()
    monkeypatch.setattr(DownloadBrowseAccess, "items_async", tracks)
    result = await DownloadBrowser.items_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=2,
        public_id="another-users-group",
        offset=0,
        status="all",
    )
    assert result.code() == AResultCode.NOT_FOUND
    tracks.assert_not_awaited()


@dataclass
class GroupActionFixture:
    group: SimpleNamespace
    row: SimpleNamespace
    media: SimpleNamespace
    clear: AsyncMock
    reset: AsyncMock
    hide: AsyncMock
    queue: Mock
    folder: Path


@pytest.fixture
def group_action(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> GroupActionFixture:
    group = SimpleNamespace(id=10, seen=False)
    row = SimpleNamespace(id=12, status_key=3)
    media = SimpleNamespace(id=20, public_id="song", provider_id=2)
    monkeypatch.setattr(
        DownloadAccess,
        "get_download_group_by_public_id",
        AsyncMock(return_value=ok(group)),
    )
    monkeypatch.setattr(
        DownloadBrowseAccess,
        "group_rows_async",
        AsyncMock(return_value=ok([(row, media)])),
    )
    provider = Mock()
    provider.get_name.return_value = "Spotify"
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=provider))
    monkeypatch.setattr(
        DownloadBrowseAccess,
        "has_other_active_async",
        AsyncMock(return_value=ok(False)),
    )
    clear = AsyncMock(return_value=ok(["song.mp3"]))
    reset = AsyncMock(return_value=ok(True))
    hide = AsyncMock(return_value=ok(True))
    queue = Mock()
    monkeypatch.setattr(DownloadBrowseAccess, "clear_files_async", clear)
    monkeypatch.setattr(DownloadBrowseAccess, "reset_group_async", reset)
    monkeypatch.setattr(DownloadAccess, "mark_download_group_seen", hide)
    monkeypatch.setattr(downloads_manager, "add_download", queue)
    monkeypatch.setattr(downloadBrowser, "MEDIA_PATH", str(tmp_path))
    (tmp_path / "song.mp3").write_bytes(b"audio")
    return GroupActionFixture(
        group=group,
        row=row,
        media=media,
        clear=clear,
        reset=reset,
        hide=hide,
        queue=queue,
        folder=tmp_path,
    )


@pytest.mark.parametrize("action", ["delete", "retry"])
async def test_group_actions_are_atomic_batches_and_preserve_source_context(
    group_action: GroupActionFixture, action: str
) -> None:
    session = AsyncMock(spec=AsyncSession)
    fixture = group_action
    result = await DownloadBrowser.group_action_async(
        session=session, user_id=1, public_id="playlist-group", action=action
    )
    assert result.is_ok()
    fixture.clear.assert_awaited_once_with(session=session, media_ids=[20])
    assert not (fixture.folder / "song.mp3").exists()
    assert (fixture.folder / "song.mp3.bak1").exists()
    session.commit.assert_awaited_once()
    if action == "delete":
        fixture.hide.assert_awaited_once_with(session=session, group=fixture.group)
        fixture.queue.assert_not_called()
    else:
        fixture.reset.assert_awaited_once_with(
            session=session, group=fixture.group, download_ids=[12]
        )
        queued = fixture.queue.call_args.args[0]
        assert isinstance(queued, DeferredDownload)
        assert queued.public_id == "song" and queued.download_group_id == 10
        assert queued.provider_id == 2 and queued.user_id == 1


@pytest.mark.parametrize("status", [1, 2, 5, 6, 7])
async def test_active_group_actions_do_not_touch_files_or_queue(
    group_action: GroupActionFixture, status: int
) -> None:
    group_action.row.status_key = status
    result = await DownloadBrowser.group_action_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=1,
        public_id="group",
        action="delete",
    )
    assert result.code() == AResultCode.BAD_REQUEST
    group_action.clear.assert_not_awaited()
    group_action.queue.assert_not_called()


async def test_another_active_group_prevents_file_changes(
    group_action: GroupActionFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        DownloadBrowseAccess, "has_other_active_async", AsyncMock(return_value=ok(True))
    )
    result = await DownloadBrowser.group_action_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=1,
        public_id="group",
        action="retry",
    )
    assert result.code() == AResultCode.BAD_REQUEST
    group_action.clear.assert_not_awaited()


async def test_failed_group_commit_restores_files_and_does_not_queue(
    group_action: GroupActionFixture,
) -> None:
    session = AsyncMock(spec=AsyncSession)
    session.commit.side_effect = RuntimeError("Database unavailable")
    result = await DownloadBrowser.group_action_async(
        session=session, user_id=1, public_id="group", action="retry"
    )
    assert result.is_not_ok()
    session.rollback.assert_awaited_once()
    assert (group_action.folder / "song.mp3").read_bytes() == b"audio"
    assert not (group_action.folder / "song.mp3.bak1").exists()
    group_action.queue.assert_not_called()


async def test_deferred_download_prepares_only_inside_worker(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.core.access.downloadReuseAccess import DownloadReuseAccess
    from backend.core.framework.models.downloadCandidate import DownloadCandidate
    from backend.utils.downloadFiles import DownloadFiles

    monkeypatch.setattr(
        DownloadReuseAccess,
        "candidates_async",
        AsyncMock(
            return_value=ok(
                [DownloadCandidate(id=1, public_id="song", provider_id=4, path=None)]
            )
        ),
    )
    monkeypatch.setattr(
        DownloadFiles, "existing_ids_async", AsyncMock(return_value=set())
    )
    provider = Mock()
    task = SimpleNamespace(
        title="Song title",
        artist="Artist",
        provider_id=0,
        retry_count=0,
        download_method_async=AsyncMock(
            return_value=AResultCode(code=AResultCode.OK, message="OK")
        ),
    )
    provider.start_download_async = AsyncMock(return_value=ok(task))
    monkeypatch.setattr(providers, "find_media_provider", Mock(return_value=provider))
    deferred = DeferredDownload(
        public_id="song", download_id=1, download_group_id=2, user_id=3
    )
    deferred.provider_id = 4
    provider.start_download_async.assert_not_awaited()
    result = await deferred.download_method_async(session=AsyncMock(spec=AsyncSession))
    assert result.is_ok()
    assert deferred.title == "Song title" and deferred.artist == "Artist"
    assert task.provider_id == 4
    task.download_method_async.assert_awaited_once()


async def test_track_pages_propagate_song_search_and_report_the_real_total(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        DownloadAccess,
        "get_download_group_by_public_id",
        AsyncMock(return_value=ok(SimpleNamespace(id=3, seen=False))),
    )
    load = AsyncMock(return_value=ok([]))
    count = AsyncMock(return_value=ok(125))
    monkeypatch.setattr(DownloadBrowseAccess, "items_async", load)
    monkeypatch.setattr(DownloadBrowseAccess, "item_count_async", count)
    result = await DownloadBrowser.items_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=1,
        public_id="group",
        offset=48,
        status="completed",
        query="A song",
    )
    assert result.is_ok() and result.result().total == 125
    assert load.call_args.kwargs["query"] == "A song"
    assert load.call_args.kwargs["limit"] == 49
    assert count.call_args.kwargs["query"] == "A song"


@pytest.mark.parametrize("source_public_id", ["playlist-source", "album-source", None])
async def test_library_group_saves_source_or_all_legacy_tracks_without_changing_files(
    group_action: GroupActionFixture,
    monkeypatch: pytest.MonkeyPatch,
    source_public_id: str | None,
) -> None:
    group_action.group.source_public_id = source_public_id
    group_action.row.status_key = 1
    second = SimpleNamespace(id=21, public_id="song-two", provider_id=2)
    monkeypatch.setattr(
        DownloadBrowseAccess,
        "group_rows_async",
        AsyncMock(
            return_value=ok(
                [
                    (group_action.row, group_action.media),
                    (group_action.row, second),
                    (group_action.row, group_action.media),
                ]
            )
        ),
    )
    save = AsyncMock(return_value=ok(True))
    monkeypatch.setattr(User, "add_medias_to_library_async", save)
    session = AsyncMock(spec=AsyncSession)
    result = await DownloadBrowser.group_action_async(
        session=session, user_id=1, public_id="group", action="library"
    )
    assert result.is_ok()
    save.assert_awaited_once_with(
        session=session,
        user_id=1,
        public_ids=[source_public_id] if source_public_id else ["song", "song-two"],
    )
    group_action.clear.assert_not_awaited()
    group_action.queue.assert_not_called()
    assert (group_action.folder / "song.mp3").read_bytes() == b"audio"


async def test_library_group_rejects_hidden_group_and_propagates_save_failure(
    group_action: GroupActionFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    group_action.group.source_public_id = None
    save = AsyncMock(
        return_value=AResult(code=AResultCode.GENERAL_ERROR, message="Save failed")
    )
    monkeypatch.setattr(User, "add_medias_to_library_async", save)
    group_action.group.seen = True
    session = AsyncMock(spec=AsyncSession)
    result = await DownloadBrowser.group_action_async(
        session=session, user_id=1, public_id="group", action="library"
    )
    assert result.code() == AResultCode.NOT_FOUND
    save.assert_not_awaited()
    group_action.group.seen = False
    result = await DownloadBrowser.group_action_async(
        session=session, user_id=1, public_id="group", action="library"
    )
    assert result.code() == AResultCode.GENERAL_ERROR
    assert result.message() == "Save failed"
