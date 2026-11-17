"""Expose cached lyrics through the same bounded search pipeline as media providers."""

from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.mediaAccess import MediaAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework import providers
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from core.responses.baseVideoResponse import BaseVideoResponse
from core.responses.searchResponse import ArtistSearchResultsItem, BaseSearchResultsItem
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class LyricsSearch(BaseMediaProvider):
    def get_name(self) -> str:
        return "lyrics"

    def search_supports_category(self) -> bool:
        return True

    def search_page_size(self) -> int:
        return 100

    async def search_media_async(
        self, session: AsyncSession, query: str
    ) -> Result[list[BaseSearchResultsItem]]:
        return await self.search_page_async(session=session, query=query)

    async def search_page_async(
        self, session: AsyncSession, query: str, limit: int = 15, media_type: str | None = None
    ) -> Result[list[BaseSearchResultsItem]]:
        scores: dict[int, float] = {}
        for provider in providers.get_lyrics_providers():
            for category in [media_type] if media_type is not None else ["song", "video"]:
                matches = await provider.search_lyrics_async(
                    session=session, query=query, limit=limit, media_type=category
                )
                if matches.is_not_ok():
                    logger.warning("Lyrics search failed: %s", matches.info())
                    return Result(code=matches.code(), message=matches.message())
                for media_id, score in matches.result().items():
                    scores[media_id] = max(scores.get(media_id, 0), score)
        if not scores:
            return Result(code=ResultCode.OK, message="OK", result=[])
        records = await MediaAccess.get_medias_from_ids_async(session=session, ids=list(scores))
        if records.is_not_ok():
            logger.warning("Lyrics media lookup failed: %s", records.info())
            return Result(code=records.code(), message=records.message())
        groups: dict[tuple[int, int], list[str]] = defaultdict(list)
        by_public_id = {record.public_id: record.id for record in records.result()}
        for record in records.result():
            groups[record.provider_id, record.media_type_key].append(record.public_id)
        results: list[BaseSearchResultsItem] = []
        for (provider_id, kind), public_ids in groups.items():
            owner = providers.find_local_media_provider(provider_id=provider_id)
            if owner is None:
                logger.warning("Lyrics media provider unavailable: %s", provider_id)
                continue
            response: Result[list[BaseSongWithAlbumResponse]] | Result[list[BaseVideoResponse]]
            if kind == MediaTypeEnum.SONG.value:
                response = await owner.get_songs_async(session=session, public_ids=public_ids)
            elif kind == MediaTypeEnum.VIDEO.value:
                response = await owner.get_videos_async(session=session, public_ids=public_ids)
            else:
                continue
            if response.is_not_ok():
                logger.warning("Lyrics result hydration failed: %s", response.info())
                return Result(code=response.code(), message=response.message())
            for media in response.result():
                results.append(
                    BaseSearchResultsItem(
                        type=media.type,
                        name=media.name,
                        providerUrl=media.providerUrl,
                        imageUrl=media.imageUrl,
                        artists=[
                            ArtistSearchResultsItem(name=artist.name, url=artist.url)
                            for artist in media.artists
                        ],
                        provider=media.provider,
                        downloaded=media.downloaded,
                        publicId=media.publicId,
                        url=f"/{media.type}/{media.publicId}",
                        lyricsScore=scores[by_public_id[media.publicId]],
                    )
                )
        results.sort(key=lambda item: (-item.lyricsScore, item.publicId or ""))
        counts: dict[str, int] = defaultdict(int)
        page: list[BaseSearchResultsItem] = []
        for item in results:
            if counts[item.type] < limit:
                page.append(item)
                counts[item.type] += 1
        return Result(code=ResultCode.OK, message="OK", result=page)


lyrics_search = LyricsSearch()
