from logging import Logger
from typing import Dict, List, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.adminSearchAccess import AdminSearchAccess
from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.responses.adminSearchResponse import (
    AdminSearchResponse,
    AdminSearchResultItem,
)
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

_MediaTypeName = Literal["artist", "album", "playlist", "song", "video", "radio"]

_MEDIA_TYPE_NAMES: Dict[int, _MediaTypeName] = {
    MediaTypeEnum.ARTIST.value: "artist",
    MediaTypeEnum.ALBUM.value: "album",
    MediaTypeEnum.PLAYLIST.value: "playlist",
    MediaTypeEnum.SONG.value: "song",
    MediaTypeEnum.VIDEO.value: "video",
    MediaTypeEnum.RADIO.value: "radio",
}


class AdminMediaSearch:
    @staticmethod
    async def search_async(
        session: AsyncSession, query: str, limit: int = 50
    ) -> AResult[AdminSearchResponse]:
        """Typo-tolerant search across every media type and provider, for admin use.

        Matches by exact internal id, exact/prefix public id, or fuzzy name
        similarity (e.g. "elton jon" matches "Elton John"). Ranking and the
        result limit are computed directly in the database.
        """

        query = query.strip()
        if not query:
            logger.error("Error searching media. Query is empty.")
            return AResult(code=AResultCode.BAD_REQUEST, message="Query is empty.")

        a_result_index = await AdminSearchAccess.search_media_index_async(
            session=session, query=query, limit=limit
        )
        if a_result_index.is_not_ok():
            logger.error(f"Error searching media index. {a_result_index.info()}")
            return AResult(code=a_result_index.code(), message=a_result_index.message())

        results: List[AdminSearchResultItem] = []
        for entry in a_result_index.result():
            media_type_name = _MEDIA_TYPE_NAMES.get(entry.media_type_key)
            if media_type_name is None:
                logger.warning(
                    f"Unknown media_type_key {entry.media_type_key} in search index, skipping."
                )
                continue

            results.append(
                AdminSearchResultItem(
                    internalId=entry.internal_id,
                    publicId=entry.public_id,
                    name=entry.name,
                    type=media_type_name,
                    provider=entry.provider_name,
                    imageUrl=entry.image_url,
                    score=round(entry.score, 2),
                )
            )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=AdminSearchResponse(results=results),
        )
