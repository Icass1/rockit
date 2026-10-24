"""Bounded, shared provider searches with independently owned DB transactions."""

import asyncio
from collections import Counter, OrderedDict
from time import monotonic

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.framework import providers
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider
from backend.core.responses.searchProviderResponse import (
    SearchProviderInfo,
    SearchProviderResponse,
    SearchProvidersResponse,
)
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class ProviderSearch:
    CACHE_SIZE: int = 128
    CACHE_TTL = 60
    TIMEOUT: float = 20
    MAX_PENDING = 32

    def __init__(self) -> None:
        self._cache: OrderedDict[
            tuple[str, str, int, str | None],
            tuple[float, AResult[SearchProviderResponse]],
        ] = OrderedDict()
        self._pending: dict[
            tuple[str, str, int, str | None],
            asyncio.Task[AResult[SearchProviderResponse]],
        ] = {}
        self._slots = asyncio.Semaphore(4)
        self._cooldowns: dict[str, tuple[float, AResult[SearchProviderResponse]]] = {}

    def catalog(self) -> SearchProvidersResponse:
        entries: list[SearchProviderInfo] = []
        for provider in providers.get_media_providers():
            if (
                type(provider).search_media_async
                is BaseMediaProvider.search_media_async
            ):
                continue
            entries.append(
                SearchProviderInfo(
                    id=provider.get_name(),
                    name=provider.get_name(),
                    onDemand=provider.search_on_demand(),
                )
            )
        return SearchProvidersResponse(providers=entries)

    async def search_async(
        self,
        provider_id: str,
        query: str,
        limit: int = 15,
        media_type: str | None = None,
    ) -> AResult[SearchProviderResponse]:
        query = " ".join(query.split())
        if len(query) < 2 or len(query) > 200 or not 15 <= limit <= 100:
            logger.warning("Invalid provider search parameters")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid search parameters"
            )
        provider = next(
            (
                candidate
                for candidate in providers.get_media_providers()
                if candidate.get_name() == provider_id
            ),
            None,
        )
        if provider is None:
            logger.warning(f"Unknown search provider {provider_id}")
            return AResult(code=AResultCode.NOT_FOUND, message="Unknown provider")
        category = media_type if provider.search_supports_category() else None
        key = (provider_id, query.casefold(), limit, category)
        cached = self._cache.get(key)
        if cached and cached[0] > monotonic():
            self._cache.move_to_end(key)
            return self._filter(cached[1], media_type)
        cooldown = self._cooldowns.get(provider_id)
        if cooldown and cooldown[0] > monotonic():
            return cooldown[1]
        task = self._pending.get(key)
        if task is None:
            if len(self._pending) >= self.MAX_PENDING:
                logger.warning("Provider search queue is full")
                return AResult(
                    code=AResultCode.GENERAL_ERROR,
                    message="Search is busy; try again shortly",
                )
            task = asyncio.create_task(
                self._run_async(key, provider, query, limit, category)
            )
            self._pending[key] = task
        # Disconnecting one client must not cancel the request shared by other clients.
        return self._filter(await asyncio.shield(task), media_type)

    @staticmethod
    def _filter(
        result: AResult[SearchProviderResponse], media_type: str | None
    ) -> AResult[SearchProviderResponse]:
        if result.is_not_ok():
            logger.error(f"Provider search unavailable. {result.info()}")
            return result
        if media_type is None:
            return result
        page = result.result()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=SearchProviderResponse(
                results=[item for item in page.results if item.type == media_type],
                hasMoreTypes=[kind for kind in page.hasMoreTypes if kind == media_type],
            ),
        )

    async def _run_async(
        self,
        key: tuple[str, str, int, str | None],
        provider: BaseMediaProvider,
        query: str,
        limit: int,
        media_type: str | None,
    ) -> AResult[SearchProviderResponse]:
        response: AResult[SearchProviderResponse]
        try:
            async with asyncio.timeout(self.TIMEOUT):
                async with self._slots:
                    # Never share an AsyncSession between concurrent provider calls.
                    async with rockit_db.session_scope_async() as session:
                        result = await provider.search_page_async(
                            session=session,
                            query=query,
                            limit=limit,
                            media_type=media_type,
                        )
                        if (
                            result.is_not_ok()
                            and result.code() == AResultCode.NOT_FOUND
                        ):
                            response = AResult(
                                code=AResultCode.OK,
                                message="OK",
                                result=SearchProviderResponse(results=[]),
                            )
                        elif result.is_not_ok():
                            logger.error(f"Provider search failed: {result.info()}")
                            await session.rollback()
                            response = AResult(
                                code=result.code(), message=result.message()
                            )
                        else:
                            items = result.result()
                            if media_type is not None:
                                items = [
                                    item for item in items if item.type == media_type
                                ]
                            counts = Counter(item.type for item in items)
                            response = AResult(
                                code=AResultCode.OK,
                                message="OK",
                                result=SearchProviderResponse(
                                    results=items,
                                    hasMoreTypes=[
                                        kind
                                        for kind, count in counts.items()
                                        if count >= limit
                                        and limit < provider.search_page_size()
                                    ],
                                ),
                            )
        except Exception as exc:
            logger.error(f"Provider search failed: {exc}", exc_info=True)
            response = AResult(
                code=AResultCode.GENERAL_ERROR, message="Provider search unavailable"
            )
        finally:
            self._pending.pop(key, None)
        ttl = self.CACHE_TTL if response.is_ok() else 10
        if response.is_not_ok():
            self._cooldowns[key[0]] = (monotonic() + ttl, response)
        self._cache[key] = (monotonic() + ttl, response)
        self._cache.move_to_end(key)
        while len(self._cache) > self.CACHE_SIZE:
            self._cache.popitem(last=False)
        return response


provider_search = ProviderSearch()
