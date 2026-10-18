import time
from datetime import datetime, timezone
from typing import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.middlewares.dbSessionMiddleware import DBSessionMiddleware

from backend.core.access.db.ormModels.requestLog import RequestLogRow

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

        request_ip: str | None = None

        x_forwarded_for = request.headers.get("x-forwarded-for")

        if x_forwarded_for:
            request_ip = x_forwarded_for.split(",")[0]
        else:
            logger.debug("Unable to get x_forwarded_for")
            if request.client:
                logger.debug("Using client host instead.")
                request_ip = request.client.host

        request.state.request_ip = request_ip

        start_time: float = time.monotonic()
        timestamp: str = datetime.now(timezone.utc).isoformat()

        response: Response = await call_next(request)

        time_taken_ms: int = int((time.monotonic() - start_time) * 1000)

        user_id: int | None = None
        try:
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
                ip=request_ip,
            )
            session.add(request_log)
            await session.commit()
        except Exception as e:
            logger.error(f"Error logging request: {e}", exc_info=True)

        return response

    @staticmethod
    def get_current_ip(request: Request) -> AResult[str]:
        try:
            return AResult(
                code=AResultCode.OK, message="OK", result=request.state.request_ip
            )
        except:
            logger.error("IP not in request state")
            return AResult(AResultCode.GENERAL_ERROR, message="IP not in request state")
