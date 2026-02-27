from typing import Callable, Awaitable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core import rockit_db


class DBSessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        async with rockit_db.session_scope_async() as session:
            request.state.db = session
            response: Response = await call_next(request)
            return response

    @staticmethod
    def get_session(request: Request) -> AsyncSession:
        return request.state.db
