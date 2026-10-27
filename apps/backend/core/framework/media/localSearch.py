"""Resolve a local recording independently of the source that found the result."""

import asyncio
import unicodedata
from collections import defaultdict

from core.access.db import db_context
from core.framework import providers
from core.framework.models.localSong import LocalSong
from core.framework.objectFiles import ObjectFiles
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.responses.searchResponse import BaseSearchResultsItem
from logger import getLogger

logger = getLogger(__name__)
_slots = asyncio.Semaphore(4)
_object_slots = asyncio.Semaphore(8)


def song_identity(name: str, artists: list[str]) -> tuple[str, tuple[str, ...]] | None:
    """Preserve version qualifiers; never infer identity from title alone."""

    def normalized(value: str) -> str:
        return " ".join(unicodedata.normalize("NFKC", value).casefold().split())

    title = normalized(name)
    credits = tuple(sorted({normalized(artist) for artist in artists if artist.strip()}))
    return (title, credits) if title and credits else None


async def _read_provider(provider: BaseMediaProvider, titles: list[str]) -> list[LocalSong]:
    """Each provider owns its SQL and transaction; remote API health is irrelevant."""
    try:
        async with asyncio.timeout(2):
            async with _slots:
                async with db_context.session_scope_async() as session:
                    result = await provider.find_local_songs_async(session=session, titles=titles)
                    if result.is_not_ok():
                        logger.warning("Local availability lookup failed: %s", result.info())
                        return []
                    return result.result()
    except Exception:
        logger.warning("Local availability lookup unavailable", exc_info=True)
        return []


async def resolve_local_results(
    items: list[BaseSearchResultsItem],
) -> list[BaseSearchResultsItem]:
    """Return detached results so shared remote-cache entries cannot become stale local truth."""
    copies = [item.model_copy(deep=True) for item in items]
    titles = list({" ".join(item.name.lower().split()) for item in items if item.type == "song"})
    if not titles:
        return copies
    local = providers.get_local_media_providers()
    supported = [
        provider
        for provider in local
        if getattr(
            type(provider),
            "find_local_songs_async",
            BaseMediaProvider.find_local_songs_async,
        )
        is not BaseMediaProvider.find_local_songs_async
    ]
    groups = await asyncio.gather(
        *(_read_provider(provider=provider, titles=titles) for provider in supported)
    )
    candidates = [song for group in groups for song in group]

    async def object_exists(song: LocalSong) -> bool:
        try:
            async with _object_slots:
                return await ObjectFiles.exists_async(key=song.storage_key)
        except Exception:
            logger.warning("Local media object lookup unavailable", exc_info=True)
            return False

    readable = {
        song.storage_key
        for song, exists in zip(
            candidates,
            await asyncio.gather(*(object_exists(song=song) for song in candidates)),
        )
        if exists
    }
    by_identity: dict[tuple[str, tuple[str, ...]], set[str]] = defaultdict(set)
    for song in candidates:
        key = song_identity(name=song.name, artists=song.artists)
        if key is not None and song.storage_key in readable:
            by_identity[key].add(song.public_id)
    for item in copies:
        if item.type != "song" or (item.downloaded and item.publicId):
            continue
        key = song_identity(name=item.name, artists=[artist.name for artist in item.artists])
        matches: set[str] = by_identity.get(key, set()) if key is not None else set()
        if len(matches) == 1:
            item.publicId = next(iter(matches))
            item.downloaded = True
    return copies
