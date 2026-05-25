from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.models.lyrics import DynamicLyricsData, LyricsData

from backend.core.framework.provider.baseLyricsProvider import BaseLyricsProvider

from backend.lrclib.framework.lrclib import Lrclib


class LrclibProvider(BaseLyricsProvider):
    def set_info(self, provider_id: int, provider_name: str) -> None:
        Lrclib.provider_name = provider_name
        Lrclib.provider = self

        self._id = provider_id
        self._name = provider_name

    async def get_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> AResult[dict[int, LyricsData]]:
        a_result = await Lrclib.get_lyrics_by_media_ids_async(
            session=session, media_ids=media_ids
        )
        if a_result.is_not_ok():
            return AResult[dict[int, LyricsData]](
                code=a_result.code(), message=a_result.message()
            )

        result_map = a_result.result()
        lyrics_map: dict[int, LyricsData] = {}
        for media_id, (public_id, lyrics, _) in result_map.items():
            if lyrics is not None:
                lyrics_map[media_id] = LyricsData(public_id=public_id, lines=lyrics)

        return AResult[dict[int, LyricsData]](
            code=AResultCode.OK, message="OK", result=lyrics_map
        )

    async def get_dynamic_lyrics_async(
        self, session: AsyncSession, media_ids: list[int]
    ) -> AResult[dict[int, DynamicLyricsData]]:
        a_result = await Lrclib.get_lyrics_by_media_ids_async(
            session=session, media_ids=media_ids
        )
        if a_result.is_not_ok():
            return AResult[dict[int, DynamicLyricsData]](
                code=a_result.code(), message=a_result.message()
            )

        result_map = a_result.result()
        dynamic_map: dict[int, DynamicLyricsData] = {}
        for media_id, (_, _, dynamic_data) in result_map.items():
            if dynamic_data is not None:
                dynamic_map[media_id] = dynamic_data

        return AResult[dict[int, DynamicLyricsData]](
            code=AResultCode.OK, message="OK", result=dynamic_map
        )


provider = LrclibProvider()
name = "LRCLIB"
