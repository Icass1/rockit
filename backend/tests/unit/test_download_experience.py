from typing import TypeVar
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.downloadAccess import DownloadAccess
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.userAccess import UserAccess
from backend.core.framework.downloader.downloader import Downloader
from backend.core.framework.media.media import Media
from backend.core.framework.user.user import User
from backend.core.framework.websocket.sendToUser import SendToUser

T = TypeVar("T")

pytestmark = pytest.mark.unit


def ok(value: T) -> AResult[T]:
    return AResult(code=AResultCode.OK, message="OK", result=value)


async def test_playlist_download_preserves_root_and_saves_root_once(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    group = SimpleNamespace(id=1, public_id="group")
    create = AsyncMock(return_value=ok(group))
    save = AsyncMock(return_value=ok(True))
    queue = AsyncMock(return_value=ok(True))
    monkeypatch.setattr(DownloadAccess, "create_download_group", create)
    monkeypatch.setattr(User, "add_medias_to_library_async", save)
    monkeypatch.setattr(
        Media,
        "get_media_from_public_id_async",
        AsyncMock(
            return_value=AResult(code=AResultCode.NOT_FOUND, message="Container")
        ),
    )
    monkeypatch.setattr(
        Downloader,
        "expand_container_async",
        AsyncMock(return_value=ok(["song-a", "song-b"])),
    )
    monkeypatch.setattr(Downloader, "_queue_downloads_async", queue)
    session = AsyncMock(spec=AsyncSession)
    result = await Downloader.download_multiple_medias_async(
        session=session,
        user_id=7,
        title="Playlist",
        public_ids=["playlist"],
        add_to_library=True,
    )
    assert result.is_ok()
    assert create.call_args.kwargs["source_public_id"] == "playlist"
    save.assert_awaited_once_with(session=session, user_id=7, public_ids=["playlist"])
    queue.assert_awaited_once_with(
        session=session, public_ids=["song-a", "song-b"], group=group, user_id=7
    )


async def test_library_failure_prevents_queueing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        DownloadAccess,
        "create_download_group",
        AsyncMock(return_value=ok(SimpleNamespace(id=1, public_id="group"))),
    )
    monkeypatch.setattr(
        User,
        "add_medias_to_library_async",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.GENERAL_ERROR, message="Database unavailable"
            )
        ),
    )
    queue = AsyncMock(return_value=ok(True))
    monkeypatch.setattr(Downloader, "_queue_downloads_async", queue)
    result = await Downloader.download_multiple_medias_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=7,
        title="Playlist",
        public_ids=["playlist"],
        add_to_library=True,
    )
    assert result.is_not_ok()
    queue.assert_not_awaited()


@pytest.mark.parametrize("status", [1, 2, 5, 6, 7])
async def test_active_download_cannot_be_deleted(
    monkeypatch: pytest.MonkeyPatch, status: int
) -> None:
    monkeypatch.setattr(
        DownloadAccess,
        "get_download_by_media_public_id",
        AsyncMock(return_value=ok(SimpleNamespace(status_key=status, media_id=1))),
    )
    monkeypatch.setattr(
        MediaAccess,
        "get_media_from_id_async",
        AsyncMock(return_value=ok(SimpleNamespace(public_id="media"))),
    )
    delete = AsyncMock()
    hide = AsyncMock()
    monkeypatch.setattr(Media, "delete_media_file_async", delete)
    monkeypatch.setattr(DownloadAccess, "dismiss_download_async", hide)
    result = await Downloader.delete_download_async(
        session=AsyncMock(spec=AsyncSession), user_id=7, public_id="download"
    )
    assert result.code() == AResultCode.BAD_REQUEST
    delete.assert_not_awaited()
    hide.assert_not_awaited()


async def test_delete_failure_keeps_history_visible(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        DownloadAccess,
        "get_download_by_media_public_id",
        AsyncMock(return_value=ok(SimpleNamespace(status_key=3, media_id=1))),
    )
    monkeypatch.setattr(
        MediaAccess,
        "get_media_from_id_async",
        AsyncMock(return_value=ok(SimpleNamespace(public_id="media"))),
    )
    delete = AsyncMock(
        return_value=AResultCode(
            code=AResultCode.GENERAL_ERROR, message="Disk unavailable"
        )
    )
    hide = AsyncMock()
    monkeypatch.setattr(Media, "delete_media_file_async", delete)
    monkeypatch.setattr(DownloadAccess, "dismiss_download_async", hide)
    session = AsyncMock(spec=AsyncSession)
    result = await Downloader.delete_download_async(
        session=session, user_id=7, public_id="download"
    )
    assert result.is_not_ok()
    delete.assert_awaited_once_with(session=session, public_id="media")
    hide.assert_not_awaited()


async def test_bulk_library_save_is_one_batch_and_preserves_playlist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        MediaAccess,
        "get_medias_from_public_ids_async",
        AsyncMock(
            return_value=ok(
                [
                    SimpleNamespace(id=1, public_id="playlist"),
                    SimpleNamespace(id=2, public_id="song"),
                ]
            )
        ),
    )
    save = AsyncMock(return_value=ok(True))
    monkeypatch.setattr(UserAccess, "add_user_library_medias_async", save)
    notify = AsyncMock()
    monkeypatch.setattr(SendToUser, "send_to_user", notify)
    session = AsyncMock(spec=AsyncSession)
    result = await User.add_medias_to_library_async(
        session=session, user_id=7, public_ids=["playlist", "song"]
    )
    assert result.is_ok()
    save.assert_awaited_once_with(session=session, user_id=7, media_ids=[1, 2])
    assert [call.kwargs["message"].publicId for call in notify.await_args_list] == [
        "playlist",
        "song",
    ]


async def test_download_response_uses_download_id_for_websocket_matching(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    now = datetime.now(timezone.utc)
    group = SimpleNamespace(
        id=1,
        public_id="group",
        source_public_id="playlist",
        title="Playlist",
        date_started=now,
        date_ended=None,
        success=1,
        fail=0,
    )
    download = SimpleNamespace(
        download_group_id=1,
        media_id=2,
        public_id="download-id",
        status_key=3,
        retry_count=0,
        date_started=now,
        date_ended=now,
    )
    media = SimpleNamespace(
        id=2, public_id="media-id", provider_id=999, media_type_key=1
    )
    monkeypatch.setattr(
        DownloadAccess,
        "get_download_groups_by_user_id",
        AsyncMock(return_value=ok([group])),
    )
    monkeypatch.setattr(
        DownloadAccess,
        "get_downloads_by_group_ids",
        AsyncMock(return_value=ok([download])),
    )
    monkeypatch.setattr(
        MediaAccess, "get_medias_from_ids_async", AsyncMock(return_value=ok([media]))
    )
    result = await Downloader.get_downloads_async(
        session=AsyncMock(spec=AsyncSession), user_id=7
    )
    assert result.is_ok()
    response = result.result().downloads[0]
    assert response.sourcePublicId == "playlist"
    assert response.items[0].publicId == "download-id"
    assert response.items[0].mediaPublicId == "media-id"


async def test_url_library_failure_is_reported_before_download_starts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from backend.core.framework import providers

    monkeypatch.setattr(
        providers,
        "add_from_url_async",
        AsyncMock(
            return_value=ok(SimpleNamespace(publicId="playlist", name="Playlist"))
        ),
    )
    monkeypatch.setattr(
        User,
        "add_media_to_library",
        AsyncMock(
            return_value=AResult(
                code=AResultCode.GENERAL_ERROR, message="Cannot save to library"
            )
        ),
    )
    queue = AsyncMock(return_value=ok(True))
    monkeypatch.setattr(Downloader, "download_multiple_medias_async", queue)
    result = await Downloader.start_download_from_url_async(
        session=AsyncMock(spec=AsyncSession),
        user_id=7,
        url="https://example.com/playlist",
        add_to_library=True,
        add_to_playlist=False,
        playlist_public_id=None,
    )
    assert result.is_not_ok() and result.message() == "Cannot save to library"
    queue.assert_not_awaited()
