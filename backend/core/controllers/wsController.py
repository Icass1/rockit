import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from logging import Logger

from backend.constants import SESSION_COOKIE
from backend.core import rockit_db
from backend.core.aResult import AResult
from backend.core.access.db.ormModels.session import SessionRow
from backend.core.framework.auth.session import Session
from backend.core.framework.websocket.webSocketManager import rockit_ws_manager
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)
router = APIRouter(prefix="/ws")


async def get_user_id_from_websocket(websocket: WebSocket) -> int:
    session_id: str | None = websocket.cookies.get(SESSION_COOKIE)
    if not session_id:
        raise WebSocketDisconnect(code=4001, reason="Not logged in")

    await rockit_db.wait_for_session_local_async()
    async with rockit_db.session_scope_async() as session:
        a_result_session: AResult[SessionRow] = (
            await Session.get_user_id_from_session_async(
                session=session, session_id=session_id
            )
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

    await rockit_ws_manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message: dict[str, object] = json.loads(data)
                await rockit_ws_manager.handle_client_message(user_id, message)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received from user {user_id}")
    except WebSocketDisconnect:
        rockit_ws_manager.disconnect(user_id, websocket)
