from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.models.queue import QueueItem
from backend.core.framework.user.user import User
from backend.core.framework.websocket.webSocketRouter import websocket_router
from backend.core.requests.wsMessages import CurrentQueueMessageRequest
from backend.core.responses.currentQueueMessage import CurrentQueueMessage

if TYPE_CHECKING:
    from backend.core.framework.websocket.webSocketManager import WebSocketManager

logger = getLogger(__name__)


@websocket_router.message("current_queue")
async def handle_current_queue(
    manager: "WebSocketManager",
    session: AsyncSession,
    user_id: int,
    data: Dict[str, Any],
    sender_websocket: WebSocket | None = None,
) -> None:
    current_queue_msg = CurrentQueueMessageRequest(**data)

    a_result_medias: AResult[List[MediaModel]] = (
        await Media.get_medias_from_public_ids_async(
            session=session,
            public_ids=[item.mediaPublicId for item in current_queue_msg.queue]
            + [
                item.listPublicId
                for item in current_queue_msg.queue
                if item.listPublicId
            ],
            media_type_keys=None,
        )
    )

    queue_items: List[QueueItem] = []

    for item in current_queue_msg.queue:
        item_id: int | None = next(
            (
                row.id
                for row in a_result_medias.result()
                if row.public_id == item.mediaPublicId
            ),
            None,
        )

        list_id: int | None = next(
            (
                row.id
                for row in a_result_medias.result()
                if row.public_id == item.listPublicId
            ),
            None,
        )

        if item_id is None:
            logger.error(
                f"Item with public id {item.mediaPublicId} not found in media table"
            )
            continue

        queue_items.append(
            QueueItem(
                media_id=item_id,
                queue_id=item.queueMediaId,
                list_id=list_id,
                sorted_index=item.sortedIndex,
                random_index=item.randomIndex,
            )
        )

    await User.save_user_queue_async(
        session=session,
        user_id=user_id,
        queue_items=queue_items,
    )

    if sender_websocket is not None:
        relay_message = CurrentQueueMessage(
            queue=current_queue_msg.queue,
        )
        await manager.send_to_user_async(
            user_id=user_id,
            message=relay_message,
            exclude_websocket=sender_websocket,
        )
