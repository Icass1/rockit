import asyncio
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import cast
from urllib.parse import urlsplit

import httpx
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.framework.provider.baseMetadataProvider import BaseMetadataProvider
from backend.core.responses.metadataResponse import MetadataResponse
from backend.utils.logger import getLogger
from backend.wikimedia.access.metadataAccess import MetadataAccess
from backend.wikimedia.framework.models.image import (
    ArtistImage,
    CommonsResponse,
    EntityResponse,
)

logger = getLogger(__name__)
_lock = asyncio.Lock()
_retry_at = 0.0
USER_AGENT = "Rockit/1.0 (https://github.com/Icass1/rockit)"


class WikimediaProvider(BaseMetadataProvider):
    async def get_metadata_async(
        self,
        session: AsyncSession,
        entity: str,
        external_id: str,
        offset: int = 0,
        limit: int = 100,
        refresh: bool = False,
    ) -> AResult[MetadataResponse]:
        """Resolve an exact Wikidata entity to a durable Commons portrait."""
        global _retry_at
        if entity != "artist-image" or not re.fullmatch(r"Q[1-9][0-9]*", external_id):
            logger.warning("Invalid Wikimedia image identifier")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid image identifier"
            )
        # Serialize cold lookups. Read and commit independently of the caller's
        # transaction; artwork is global rather than owned by a user's session.
        async with _lock:
            try:
                async with rockit_db.session_scope_async() as cache_session:
                    cached = await MetadataAccess.read_async(
                        session=cache_session, key=external_id
                    )
                    if cached.is_not_ok():
                        logger.error("Wikimedia cache read failed: %s", cached.info())
                        return AResult(code=cached.code(), message=cached.message())
                    rows = cached.result()
                    old = rows[0] if rows else None
                    if (
                        old is not None
                        and not refresh
                        and (
                            old.payload.get("imageUrl")
                            or old.payload.get("lookupVersion") == 2
                        )
                    ):
                        return self._response(
                            external_id,
                            ArtistImage.model_validate(old.payload),
                            old.fetched_at,
                            True,
                        )
                    if asyncio.get_running_loop().time() < _retry_at:
                        if old is not None:
                            return self._response(
                                external_id,
                                ArtistImage.model_validate(old.payload),
                                old.fetched_at,
                                True,
                            )
                        logger.warning("Wikimedia cooldown active")
                        return AResult(
                            code=AResultCode.SERVICE_UNAVAILABLE,
                            message="Image provider temporarily unavailable",
                        )
                    try:
                        gate = await MetadataAccess.lock_async(
                            session=cache_session, key=external_id
                        )
                        if gate.is_not_ok():
                            logger.error("Wikimedia cache lock failed: %s", gate.info())
                            return AResult(code=gate.code(), message=gate.message())
                        if not gate.result():
                            logger.info("Wikimedia image lookup already running")
                            return AResult(
                                code=AResultCode.SERVICE_UNAVAILABLE,
                                message="Image lookup already running",
                            )
                        latest = await MetadataAccess.read_async(
                            session=cache_session, key=external_id
                        )
                        if latest.is_not_ok():
                            logger.error(
                                "Wikimedia cache recheck failed: %s", latest.info()
                            )
                            return AResult(code=latest.code(), message=latest.message())
                        if (
                            latest.result()
                            and not refresh
                            and (
                                latest.result()[0].payload.get("imageUrl")
                                or latest.result()[0].payload.get("lookupVersion") == 2
                            )
                        ):
                            row = latest.result()[0]
                            return self._response(
                                external_id,
                                ArtistImage.model_validate(row.payload),
                                row.fetched_at,
                                True,
                            )
                        image = await self._lookup_async(external_id=external_id)
                    except (httpx.HTTPError, ValueError, ValidationError) as error:
                        delay = 60.0
                        if isinstance(error, httpx.HTTPStatusError):
                            try:
                                delay = max(
                                    delay,
                                    float(
                                        error.response.headers.get("Retry-After", "60")
                                    ),
                                )
                            except ValueError:
                                try:
                                    deadline = cast(
                                        datetime,
                                        parsedate_to_datetime(
                                            error.response.headers.get(
                                                "Retry-After", ""
                                            )
                                        ),
                                    )
                                    delay = max(
                                        delay,
                                        (
                                            deadline - datetime.now(timezone.utc)
                                        ).total_seconds(),
                                    )
                                except (ValueError, TypeError, OverflowError):
                                    pass
                        _retry_at = asyncio.get_running_loop().time() + delay
                        logger.warning("Wikimedia image lookup failed", exc_info=True)
                        if old is not None:
                            return self._response(
                                external_id,
                                ArtistImage.model_validate(old.payload),
                                old.fetched_at,
                                True,
                            )
                        return AResult(
                            code=AResultCode.SERVICE_UNAVAILABLE,
                            message="Image provider temporarily unavailable",
                        )
                    # Successful empty results are cached too; unavailable images
                    # must not trigger new requests every time an artist is opened.
                    saved = await MetadataAccess.save_async(
                        session=cache_session,
                        key=external_id,
                        payload=image.model_dump(),
                    )
                    if saved.is_not_ok():
                        logger.error("Wikimedia cache write failed: %s", saved.info())
                        return AResult(code=saved.code(), message=saved.message())
                    return self._response(external_id, image, saved.result(), False)
            except Exception:
                logger.exception("Wikimedia image cache unavailable")
                return AResult(
                    code=AResultCode.SERVICE_UNAVAILABLE,
                    message="Image provider temporarily unavailable",
                )

    @staticmethod
    def _response(
        external_id: str, image: ArtistImage, stamp: datetime, cached: bool
    ) -> AResult[MetadataResponse]:
        """Expose a neutral image result without leaking source payloads."""
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=MetadataResponse(
                provider="Wikimedia",
                entity="artist-image",
                externalId=external_id,
                data=image.model_dump(),
                cached=cached,
                fetchedAt=stamp.astimezone(timezone.utc).isoformat(),
            ),
        )

    @staticmethod
    async def _lookup_async(external_id: str) -> ArtistImage:
        """Use P18 images only; never search names or borrow album artwork."""
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(6.0),
            follow_redirects=False,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            response = await client.get(
                # EntityData is the cacheable public entity document. Avoid
                # asking the Action API to assemble all claims on every miss.
                f"https://www.wikidata.org/wiki/Special:EntityData/{external_id}.json",
                follow_redirects=True,
            )
            response.raise_for_status()
            document = EntityResponse.model_validate(response.json())
            if document.error is not None:
                raise ValueError(
                    f"Wikidata API error: {document.error.code}: {document.error.info[:400]}"
                )
            entity = document.entities.get(external_id)
            if entity is None:
                raise ValueError(
                    f"Wikidata response missing requested entity {external_id}"
                )
            claims = entity.claims.P18 if entity else []
            candidates = sorted(
                (
                    claim
                    for claim in claims
                    if claim.rank != "deprecated"
                    and claim.mainsnak.datavalue
                    and claim.mainsnak.datavalue.value
                ),
                key=lambda claim: claim.rank == "preferred",
                reverse=True,
            )
            if not candidates:
                return ArtistImage()
            value = candidates[0].mainsnak.datavalue
            if value is None:
                return ArtistImage()
            response = await client.get(
                "https://commons.wikimedia.org/w/api.php",
                params={
                    "action": "query",
                    "format": "json",
                    "formatversion": 2,
                    "prop": "imageinfo",
                    "titles": f"File:{value.value}",
                    "iiprop": "url|size",
                    "iiurlwidth": 1600,
                    "maxlag": 5,
                },
            )
            response.raise_for_status()
            document_image = CommonsResponse.model_validate(response.json())
            if document_image.error is not None:
                raise ValueError(
                    f"Commons API error: {document_image.error.code}: {document_image.error.info[:400]}"
                )
            pages = document_image.query.pages
            info = next((page.imageinfo[0] for page in pages if page.imageinfo), None)
            if info is None:
                return ArtistImage()
            preferred = info.thumburl if info.width > 1600 else info.url
            url = ""
            for candidate in dict.fromkeys([preferred, info.url, info.thumburl]):
                if not candidate:
                    continue
                parsed = urlsplit(candidate)
                allowed = (
                    parsed.hostname == "upload.wikimedia.org"
                    and parsed.path.startswith("/wikipedia/commons/")
                ) or (
                    parsed.hostname == "commons.wikimedia.org"
                    and parsed.path == "/w/thumb.php"
                )
                if (
                    allowed
                    and parsed.scheme in ("https", "http", "")
                    and not parsed.username
                    and parsed.port in (None, 443)
                ):
                    url = parsed._replace(scheme="https").geturl()
                    break
                logger.warning(
                    "Rejected Commons image URL: scheme=%s host=%s path=%s",
                    parsed.scheme,
                    parsed.hostname,
                    parsed.path[:200],
                )
            if not url:
                # A rejected URL is a failed resolution, not proof that the
                # artist has no image. Never persist it as a missing portrait.
                raise ValueError("Commons returned no supported image URL")
            return ArtistImage(
                imageUrl=url,
                sourceUrl=info.descriptionurl,
                width=info.width,
                height=info.height,
            )


provider = WikimediaProvider()
name = "Wikimedia"
