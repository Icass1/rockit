import asyncio
import hashlib
import json
import os
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, cast

import httpx

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.responses.metadataResponse import MetadataResponse
from backend.musicBrainz.access.metadataAccess import MetadataAccess

logger = getLogger(__name__)
BASE_URL = "https://musicbrainz.org/ws/2"
USER_AGENT = os.environ.get(
    "MUSICBRAINZ_USER_AGENT", "Rockit/1.0 (https://github.com/Icass1/rockit)"
)
INTERVAL_SECONDS = 1.1
_inflight: set[asyncio.Task[AResult[MetadataResponse]]] = set()
_pending: dict[str, asyncio.Task[AResult[MetadataResponse]]] = {}


def retry_delay(value: str | None) -> float:
    """Accept both HTTP Retry-After formats; default to a conservative minute."""
    if value:
        try:
            return max(60.0, float(value))
        except ValueError:
            try:
                deadline = parsedate_to_datetime(value)
                return max(
                    60.0, (deadline - datetime.now(timezone.utc)).total_seconds()
                )
            except (ValueError, TypeError, OverflowError):
                pass
    return 60.0


class MusicBrainzApi:
    @staticmethod
    async def fetch_async(
        path: str,
        params: dict[str, str | int],
        entity: str,
        external_id: str | None = None,
        refresh: bool = False,
    ) -> AResult[MetadataResponse]:
        """Keep an independent transaction alive even if the HTTP caller disconnects.

        This protects the shared cooldown and cache commit after an outbound
        request. Source metadata is global, never tied to a user's transaction.
        """
        request_key = json.dumps(
            [path, params, entity, external_id, refresh], sort_keys=True
        )
        task = _pending.get(request_key)
        if task is None:
            task = asyncio.create_task(
                MusicBrainzApi._fetch_async(
                    path=path,
                    params=params,
                    entity=entity,
                    external_id=external_id,
                    refresh=refresh,
                )
            )
            _pending[request_key] = task
            _inflight.add(task)

            def completed(done: asyncio.Task[AResult[MetadataResponse]]) -> None:
                _inflight.discard(done)
                if _pending.get(request_key) is done:
                    _pending.pop(request_key, None)

            task.add_done_callback(completed)
        return await asyncio.shield(task)

    @staticmethod
    async def _fetch_async(
        path: str,
        params: dict[str, str | int],
        entity: str,
        external_id: str | None,
        refresh: bool,
    ) -> AResult[MetadataResponse]:
        key = hashlib.sha256(
            json.dumps([path, params], sort_keys=True).encode()
        ).hexdigest()
        try:
            async with rockit_db.session_scope_async() as session:
                cached = await MetadataAccess.read_async(session=session, key=key)
                if cached.is_not_ok():
                    logger.error(f"MusicBrainz cache read failed: {cached.info()}")
                    return AResult(code=cached.code(), message=cached.message())
                old = cached.result()[0] if cached.result() else None
                old_stamp = old.fetched_at if old is not None else None
                if old is not None and not refresh:
                    return AResult(
                        code=AResultCode.OK,
                        message="OK",
                        result=MetadataResponse(
                            provider="MusicBrainz",
                            entity=entity,
                            externalId=external_id,
                            data=old.payload,
                            cached=True,
                            fetchedAt=old.fetched_at.isoformat(),
                        ),
                    )
                # Lock spans the HTTP call and cooldown update, not just scheduling.
                gate = await MetadataAccess.lock_async(session=session)
                if gate.is_not_ok():
                    logger.error(f"MusicBrainz gate failed: {gate.info()}")
                    if old is not None:
                        return AResult(
                            code=AResultCode.OK,
                            message="Cached metadata retained",
                            result=MetadataResponse(
                                provider="MusicBrainz",
                                entity=entity,
                                externalId=external_id,
                                data=old.payload,
                                cached=True,
                                fetchedAt=old.fetched_at.isoformat(),
                                stale=True,
                            ),
                        )
                    return AResult(code=gate.code(), message=gate.message())
                # Another worker may have populated/refreshed the same key while we waited.
                latest = await MetadataAccess.read_async(session=session, key=key)
                if latest.is_not_ok():
                    logger.error(f"MusicBrainz cache recheck failed: {latest.info()}")
                    return AResult(code=latest.code(), message=latest.message())
                row = latest.result()[0] if latest.result() else None
                if row is not None and (
                    not refresh
                    or old is None
                    or (old_stamp is not None and row.fetched_at > old_stamp)
                ):
                    return AResult(
                        code=AResultCode.OK,
                        message="OK",
                        result=MetadataResponse(
                            provider="MusicBrainz",
                            entity=entity,
                            externalId=external_id,
                            data=row.payload,
                            cached=True,
                            fetchedAt=row.fetched_at.isoformat(),
                        ),
                    )
                delay = gate.result()
                payload: dict[str, Any] | None = None
                failure = f"MusicBrainz cooldown active; retry in {int(delay) + 1}s"
                if delay > 5.0:
                    logger.info(
                        "MusicBrainz upstream request skipped: cooldown %.1fs", delay
                    )
                failure_code = AResultCode.SERVICE_UNAVAILABLE
                cooldown = INTERVAL_SECONDS
                if delay <= 5.0:
                    await asyncio.sleep(delay)
                    failure = "MusicBrainz temporarily unavailable"
                    try:
                        async with httpx.AsyncClient(
                            timeout=12.0, follow_redirects=False
                        ) as client:
                            logger.info("MusicBrainz upstream GET %s", path)
                            response = await client.get(
                                f"{BASE_URL}/{path}",
                                params={**params, "fmt": "json"},
                                headers={
                                    "User-Agent": USER_AGENT,
                                    "Accept": "application/json",
                                },
                            )
                        if response.status_code in (429, 503):
                            cooldown = retry_delay(response.headers.get("Retry-After"))
                        if response.status_code == 429:
                            failure_code = AResultCode.RATE_LIMITED
                        elif response.status_code == 404:
                            failure_code = AResultCode.NOT_FOUND
                        elif 400 <= response.status_code < 500:
                            failure_code = AResultCode.BAD_REQUEST
                        if response.is_success:
                            raw: Any = response.json()
                            if isinstance(raw, dict):
                                payload = cast(dict[str, Any], raw)
                        else:
                            failure = f"MusicBrainz HTTP {response.status_code}"
                    except (httpx.HTTPError, ValueError) as error:
                        logger.warning(
                            "MusicBrainz request failed: %s", type(error).__name__
                        )
                    postponed = await MetadataAccess.postpone_async(
                        session=session, seconds=cooldown
                    )
                    if postponed.is_not_ok():
                        logger.error(
                            f"MusicBrainz cooldown write failed: {postponed.info()}"
                        )
                        return AResult(
                            code=postponed.code(), message=postponed.message()
                        )
                if payload is not None:
                    saved = await MetadataAccess.save_async(
                        session=session, key=key, payload=payload
                    )
                    if saved.is_not_ok():
                        logger.error(f"MusicBrainz cache write failed: {saved.info()}")
                        return AResult(code=saved.code(), message=saved.message())
                    return AResult(
                        code=AResultCode.OK,
                        message="OK",
                        result=MetadataResponse(
                            provider="MusicBrainz",
                            entity=entity,
                            externalId=external_id,
                            data=payload,
                            cached=False,
                            fetchedAt=saved.result().isoformat(),
                        ),
                    )
                logger.warning(failure)
                if row is not None:
                    return AResult(
                        code=AResultCode.OK,
                        message="Cached metadata retained",
                        result=MetadataResponse(
                            provider="MusicBrainz",
                            entity=entity,
                            externalId=external_id,
                            data=row.payload,
                            cached=True,
                            fetchedAt=row.fetched_at.isoformat(),
                            stale=True,
                        ),
                    )
                return AResult(code=failure_code, message=failure)
        except Exception:
            logger.exception("MusicBrainz metadata request failed")
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message="MusicBrainz metadata unavailable",
            )
