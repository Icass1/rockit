from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.librarySearchAccess import LibrarySearchAccess
from core.framework import providers
from core.models.librarySongSearch import LibrarySongSort
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.librarySongSearchResponse import LibrarySongSearchResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class LibrarySearch:
    @staticmethod
    async def songs_async(
        session: AsyncSession,
        user_id: int,
        query: str,
        offset: int = 0,
        limit: int = 50,
        sort: LibrarySongSort = "relevance",
    ) -> Result[LibrarySongSearchResponse]:
        """Hydrate only the requested page in provider batches, without expanding albums."""
        found = await LibrarySearchAccess.songs_async(
            session=session, user_id=user_id, query=query, offset=offset, limit=limit, sort=sort
        )
        if found.is_not_ok():
            logger.error(f"Library song search failed: {found.info()}")
            return Result(code=found.code(), message=found.message())
        records, total = found.result()
        groups: dict[int, list[str]] = defaultdict(list)
        for record in records:
            groups[record.provider_id].append(record.public_id)
        songs: dict[str, BaseSongWithAlbumResponse] = {}
        for provider_id, ids in groups.items():
            provider = providers.find_media_provider(provider_id=provider_id)
            if provider is None:
                logger.error("Library song provider unavailable: %s", provider_id)
                return Result(code=ResultCode.NOT_FOUND, message="Song provider unavailable")
            response = await provider.get_songs_async(session=session, public_ids=ids)
            if response.is_not_ok():
                logger.error(f"Library song hydration failed: {response.info()}")
                return Result(code=response.code(), message=response.message())
            songs.update({song.publicId: song for song in response.result()})
        if any(record.public_id not in songs for record in records):
            logger.error("Library search page could not be fully hydrated")
            return Result(code=ResultCode.GENERAL_ERROR, message="Song metadata unavailable")
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=LibrarySongSearchResponse(
                songs=[songs[record.public_id] for record in records],
                total=total,
                offset=offset,
                limit=limit,
                hasMore=offset + len(records) < total,
            ),
        )
