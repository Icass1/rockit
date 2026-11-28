from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import WebSocket
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.user import UserRow
from core.access.db.ormModels.user_queue import UserQueueRow
from core.access.userAccess import UserAccess
from core.access.userQueueAccess import UserQueueAccess
from core.framework.media.media import Media
from core.framework.models.media import MediaModel
from core.framework.websocket.handlers.current_queue import handle_current_queue
from core.framework.websocket.webSocketManager import WebSocketManager
from core.models.queueItem import QueueItem
from core.responses.baseVideoResponse import BaseVideoResponse
from result import Result

pytestmark = pytest.mark.unit


@pytest.mark.parametrize("start,end", [(None, None), (1000, None), (None, 5000), (1000, 5000)])
async def test_queue_bounds_survive_websocket_save_and_paged_reload(
    monkeypatch: pytest.MonkeyPatch, start: int | None, end: int | None
) -> None:
    from core.framework.user.user import User

    session = AsyncMock(spec=AsyncSession)
    session.execute.return_value = MagicMock()
    viewer = cast(UserRow, SimpleNamespace(current_queue_id=0, queue_type_key=2))
    monkeypatch.setattr(
        UserAccess, "get_user_from_id", AsyncMock(return_value=Result[UserRow].ok(viewer))
    )
    monkeypatch.setattr(
        Media,
        "get_medias_from_public_ids_async",
        AsyncMock(
            return_value=Result[list[MediaModel]].ok(
                [MediaModel(public_id="concert", id=7, provider_id=1)]
            )
        ),
    )
    manager = MagicMock(spec=WebSocketManager)
    manager.send_to_user_async = AsyncMock()
    sender = AsyncMock(spec=WebSocket)
    await handle_current_queue(
        manager=manager,
        session=session,
        user_id=42,
        sender_websocket=sender,
        data=dict(
            queue=[
                dict(
                    mediaPublicId="concert",
                    listPublicId=None,
                    queueMediaId=0,
                    sortedIndex=0,
                    randomIndex=0,
                    startTimeMs=start,
                    endTimeMs=end,
                )
            ]
        ),
    )
    session.commit.assert_awaited_once()
    row = session.add.call_args.kwargs["instance"]
    assert isinstance(row, UserQueueRow)
    assert row.user_id == 42
    assert row.media_id == 7
    assert (row.start_time_ms, row.end_time_ms) == (start, end)
    relay = manager.send_to_user_async.await_args.kwargs["message"]
    assert (relay.queue[0].startTimeMs, relay.queue[0].endTimeMs) == (start, end)

    row.media = CoreMediaRow(id=7, provider_id=1, media_type_key=5, public_id="concert")
    monkeypatch.setattr(
        UserQueueAccess,
        "get_user_queue_page_async",
        AsyncMock(return_value=Result[tuple[list[UserQueueRow], int, int]].ok(([row], 1, 0))),
    )
    video = BaseVideoResponse(
        publicId="concert",
        name="Concert",
        provider="test",
        providerUrl="",
        imageUrl="",
        dominantColor="",
        artists=[],
        duration_ms=60000,
        downloaded=True,
    )
    provider = MagicMock()
    provider.get_videos_async = AsyncMock(return_value=Result[list[BaseVideoResponse]].ok([video]))
    monkeypatch.setattr(
        "core.framework.user.user.providers.find_media_provider", MagicMock(return_value=provider)
    )
    loaded = await User.get_user_queue_async(session=session, user_id=42)
    assert loaded.is_ok(), loaded.info()
    item = loaded.result().queue[0]
    assert (item.startTimeMs, item.endTimeMs) == (start, end)


@pytest.mark.parametrize(
    "start,end",
    [(-1, None), (None, -1), (None, 0), (1000, 1000), (2000, 1000), (1.5, None), (2**31, None)],
)
def test_invalid_queue_time_bounds_are_rejected(start: float | None, end: int | None) -> None:
    with pytest.raises(ValidationError):
        QueueItem.model_validate(
            dict(
                mediaPublicId="concert",
                queueMediaId=0,
                randomIndex=0,
                sortedIndex=0,
                startTimeMs=start,
                endTimeMs=end,
            )
        )


def test_older_queue_messages_default_to_unbounded_playback() -> None:
    item = QueueItem(mediaPublicId="concert", queueMediaId=0, randomIndex=0, sortedIndex=0)
    assert item.startTimeMs is None and item.endTimeMs is None
