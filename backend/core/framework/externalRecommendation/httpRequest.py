from typing import Any, cast

import httpx

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode
from backend.core.framework.externalRecommendation.rateLimiter import RateLimiter

logger = getLogger(__name__)

# One retry at most, and only for HTTP 429 when the server asks us to wait
# no longer than this. Timeouts, connection errors and 5xx are not retried:
# the local recommendations are already there, so failing fast is cheaper
# than making the user wait.
MAX_ATTEMPTS = 2
MAX_RETRY_WAIT_SECONDS = 2.0


async def send_rate_limited_request_async(
    client: httpx.AsyncClient,
    limiter: RateLimiter,
    provider_name: str,
    method: str,
    url: str,
    **kwargs: Any,
) -> AResult[httpx.Response]:
    """Send one request through the provider's rate limiter.

    Returns the response for any non-429 status (callers decide what the
    status means), or a non-OK AResult on timeout, connection failure or
    when the rate limit does not allow the request. Never raises and never
    logs request parameters, which may hold credentials.
    """

    for attempt in range(MAX_ATTEMPTS):
        if not await limiter.acquire_async():
            return AResult(
                code=AResultCode.RATE_LIMITED,
                message=f"{provider_name} rate limit active, skipping request",
            )

        try:
            response = await client.request(method, url, **kwargs)
        except httpx.TimeoutException:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"{provider_name} request timed out",
            )
        except httpx.HTTPError as e:
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"{provider_name} request failed: {type(e).__name__}",
            )

        limiter.update_from_response(
            status_code=response.status_code, headers=response.headers
        )

        if response.status_code != 429:
            return AResult(code=AResultCode.OK, message="OK", result=response)

        is_last_attempt = attempt == MAX_ATTEMPTS - 1
        if is_last_attempt or limiter.cooldown_remaining() > MAX_RETRY_WAIT_SECONDS:
            break

    return AResult(
        code=AResultCode.RATE_LIMITED,
        message=f"{provider_name} rate limited the request (HTTP 429)",
    )


def as_json_object(value: Any) -> dict[str, Any] | None:
    """The value as a JSON object, or None if it is anything else."""

    return cast(dict[str, Any], value) if isinstance(value, dict) else None


def as_json_list(value: Any) -> list[Any] | None:
    """The value as a JSON array, or None if it is anything else."""

    return cast(list[Any], value) if isinstance(value, list) else None
