"""Append response timing to Uvicorn's existing access log format."""

import logging
from contextvars import ContextVar
from time import perf_counter

from fastapi import FastAPI
from starlette.types import ASGIApp, Receive, Scope, Send

_request_started_at: ContextVar[float | None] = ContextVar("request_started_at", default=None)


class AccessLogTimingFormatter(logging.Formatter):
    """Preserve the configured formatter, including Uvicorn's status text and colors."""

    def __init__(self, formatter: logging.Formatter | None) -> None:
        super().__init__()
        self.formatter = formatter or logging.Formatter()

    def format(self, record: logging.LogRecord) -> str:
        message = self.formatter.format(record)
        started_at = _request_started_at.get()
        if started_at is None:
            return message
        elapsed_ms = (perf_counter() - started_at) * 1000
        return f"{message} - {elapsed_ms:.2f} ms"


class TimedFastAPI(FastAPI):
    """Keep timing available to Uvicorn, including for middleware errors and 500s."""

    def build_middleware_stack(self) -> ASGIApp:
        """Extend access formatters after Uvicorn has configured its logging handlers."""
        for handler in logging.getLogger("uvicorn.access").handlers:
            if not isinstance(handler.formatter, AccessLogTimingFormatter):
                handler.setFormatter(AccessLogTimingFormatter(handler.formatter))
        return super().build_middleware_stack()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Time each HTTP request independently through the normal response-start log."""
        if scope["type"] != "http":
            await super().__call__(scope, receive, send)
            return

        token = _request_started_at.set(perf_counter())
        try:
            await super().__call__(scope, receive, send)
        finally:
            _request_started_at.reset(token)
