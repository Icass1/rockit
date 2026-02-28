import time
from datetime import datetime, timezone
from typing import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.core.access.db.ormModels.requestLog import RequestLogRow
from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class RequestLogMiddleware(BaseHTTPMiddleware):
    EXCLUDED_ROUTES: set[str] = {"/docs", "/openapi.json", "/redoc"}

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path in self.EXCLUDED_ROUTES:
            return await call_next(request)

        start_time: float = time.time()
        timestamp: str = datetime.now(timezone.utc).isoformat()

        response: Response = await call_next(request)

        time_taken_ms: int = int((time.time() - start_time) * 1000)

        user_id: int | None = None
        try:
            # user = DBSessionMiddleware.get_session(request=request)
            if hasattr(request.state, "user") and request.state.user:
                user_id = request.state.user.id
        except:
            pass

        route: str = request.url.path
        method: str = request.method
        response_code: int = response.status_code

        try:
            session = DBSessionMiddleware.get_session(request=request)
            request_log = RequestLogRow(
                user_id=user_id,
                route=route,
                method=method,
                response_code=response_code,
                time_taken_ms=time_taken_ms,
                timestamp=timestamp,
            )
            session.add(request_log)
            await session.commit()
        except Exception as e:
            logger.error(f"Error logging request: {e}", exc_info=True)

        return response
