from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.okResponse import OkResponse
from backend.utils.logger import getLogger

from backend.core.access.userSongAccess import UserSongAccess
from backend.core.access.mediaAccess import MediaAccess

logger = getLogger(__name__)


class UserSong:
    @staticmethod
    async def toggle_like(
        session: AsyncSession, user_id: int, song_public_id: str
    ) -> AResult[OkResponse]:
        a_result_song = await MediaAccess.get_song_from_public_id_async(
            session=session, public_id=song_public_id
        )
        if a_result_song.is_not_ok():
            logger.error(f"Song not found: {a_result_song.info()}")
            return AResult(code=a_result_song.code(), message=a_result_song.message())

        song = a_result_song.result()
        a_result_check = await UserSongAccess.is_song_liked(
            session=session, user_id=user_id, song_id=song.id
        )

        if a_result_check.is_not_ok():
            logger.error(f"Error checking like status: {a_result_check.info()}")
            return AResult(code=a_result_check.code(), message=a_result_check.message())

        is_liked = a_result_check.result()

        if is_liked:
            a_result_remove = await UserSongAccess.remove_like(
                session=session, user_id=user_id, song_id=song.id
            )
            if a_result_remove.is_not_ok():
                logger.error(f"Error removing like: {a_result_remove.info()}")
                return AResult(
                    code=a_result_remove.code(), message=a_result_remove.message()
                )
        else:
            a_result_add = await UserSongAccess.add_like(
                session=session, user_id=user_id, song_id=song.id
            )
            if a_result_add.is_not_ok():
                logger.error(f"Error adding like: {a_result_add.info()}")
                return AResult(code=a_result_add.code(), message=a_result_add.message())

        return AResult(code=AResultCode.OK, message="OK", result=OkResponse())

    @staticmethod
    async def get_liked_songs(
        session: AsyncSession, user_id: int
    ) -> AResult[List[str]]:
        a_result = await UserSongAccess.get_user_liked_song_public_ids(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting liked songs: {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def like_songs(
        session: AsyncSession, user_id: int, song_public_ids: List[str]
    ) -> AResult[OkResponse]:
        for song_public_id in song_public_ids:
            a_result_song = await MediaAccess.get_song_from_public_id_async(
                session=session, public_id=song_public_id
            )
            if a_result_song.is_not_ok():
                logger.error(
                    f"Song not found: {song_public_id}, {a_result_song.info()}"
                )
                continue

            song = a_result_song.result()

            a_result_check = await UserSongAccess.is_song_liked(
                session=session, user_id=user_id, song_id=song.id
            )
            if a_result_check.is_not_ok():
                logger.error(f"Error checking like status: {a_result_check.info()}")
                continue

            is_liked = a_result_check.result()

            if not is_liked:
                a_result_add = await UserSongAccess.add_like(
                    session=session, user_id=user_id, song_id=song.id
                )
                if a_result_add.is_not_ok():
                    logger.error(f"Error adding like: {a_result_add.info()}")
                    continue

        return AResult(code=AResultCode.OK, message="OK", result=OkResponse())
