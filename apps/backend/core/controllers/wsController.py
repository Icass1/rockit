import json
from logging import Logger
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from constants import SESSION_COOKIE
from core import db_context
from core.access.db.ormModels.session import SessionRow
from core.framework.auth.session import Session
from core.framework.websocket.webSocketManager import ws_manager
from logger import getLogger
from result import Result

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/ws", tags=["Core", "WS"])


async def get_user_id_from_websocket(websocket: WebSocket) -> int:
    session_id: str | None = websocket.cookies.get(SESSION_COOKIE)
    if not session_id:
        raise WebSocketDisconnect(code=4001, reason="Not logged in")

    await db_context.wait_for_session_local_async()
    async with db_context.session_scope_async() as session:
        a_result_session: Result[SessionRow] = await Session.get_user_id_from_session_async(
            session=session, session_id=session_id
        )
        if a_result_session.is_not_ok():
            raise WebSocketDisconnect(code=4001, reason="Invalid session")

        return a_result_session.result().user_id


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket) -> None:
    try:
        user_id: int = await get_user_id_from_websocket(websocket)
    except WebSocketDisconnect as e:
        await websocket.close(code=e.code, reason=e.reason)
        return

    await ws_manager.connect(user_id, websocket)

    try:
        while True:
            data: str = await websocket.receive_text()
            try:
                message: dict[str, Any] = json.loads(data)
                await ws_manager.handle_client_message_async(user_id, websocket, message)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user_id}")
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect_async(user_id, websocket)
