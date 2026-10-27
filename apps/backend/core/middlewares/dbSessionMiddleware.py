from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware

from core import db_context


class DBSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        await db_context.wait_for_session_local_async()

        async with db_context.session_scope_async() as session:
            request.state.db = session
            response: Response = await call_next(request)
            if response.status_code >= 400:
                await session.rollback()
                session.info.pop("social_events", None)
                session.info.pop("after_commit", None)
        return response

    @staticmethod
    def get_session(request: Request) -> AsyncSession:
        return request.state.db
