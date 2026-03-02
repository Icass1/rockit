from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.user_media import UserMediaRow
from backend.core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.utils.logger import getLogger

from backend.core.access.userAccess import UserAccess
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.userSongAccess import UserSongAccess
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework import providers

from backend.core.responses.queueResponse import QueueResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse

logger = getLogger(__name__)


class User:
    @staticmethod
    def get_user_queue(user_id: int) -> AResult[QueueResponse]:
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=QueueResponse(currentQueueSongId=None, queue=[]),
        )

    @staticmethod
    async def get_user_medias(
        session: AsyncSession, user_id: int
    ) -> AResult[List[BaseAlbumWithoutSongsResponse]]:
        """Get all albums for a user."""

        a_result_albums = await UserAccess.get_user_medias(
            session=session, user_id=user_id
        )

        if a_result_albums.is_not_ok():
            logger.error(f"Error getting user albums. {a_result_albums.info()}")
            return AResult(
                code=a_result_albums.code(), message=a_result_albums.message()
            )

        albums: List[BaseAlbumWithoutSongsResponse] = []
        for _, album, provider in a_result_albums.result():
            provider_instance: BaseProvider | None = providers.find_provider(
                provider_id=provider.id
            )
            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider.id}.")
                continue

            a_result_album: AResult[BaseAlbumWithSongsResponse] = (
                await provider_instance.get_album_async(
                    session=session, public_id=album.public_id
                )
            )
            if a_result_album.is_not_ok():
                logger.error(
                    f"Error getting album from provider. {a_result_album.info()}"
                )
                continue

            albums.append(a_result_album.result())

        return AResult(code=AResultCode.OK, message="OK", result=albums)

    @staticmethod
    async def add_media_to_library(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> AResult[UserMediaRow]:
        """Add an album to user's library by public_id."""

        a_result_album: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=album_public_id,
                media_type_key=MediaTypeEnum.ALBUM.value,
            )
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        a_result_user_album: AResult[UserMediaRow] = await UserAccess.add_user_media(
            session=session, user_id=user_id, media_id=a_result_album.result().id
        )
        if a_result_user_album.is_not_ok():
            logger.error(f"Error adding album to library. {a_result_user_album.info()}")
            return AResult(
                code=a_result_user_album.code(), message=a_result_user_album.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_user_album.result()
        )

    @staticmethod
    async def remove_album_from_library(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> AResult[bool]:
        """Remove an album from user's library by public_id."""

        a_result_album: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=album_public_id,
                media_type_key=MediaTypeEnum.ALBUM.value,
            )
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        a_result_removed: AResult[bool] = await UserAccess.remove_user_media(
            session=session, user_id=user_id, media_id=a_result_album.result().id
        )
        if a_result_removed.is_not_ok():
            logger.error(
                f"Error removing album from library. {a_result_removed.info()}"
            )
            return AResult(
                code=a_result_removed.code(), message=a_result_removed.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_removed.result()
        )

    @staticmethod
    async def like_song(
        session: AsyncSession, user_id: int, song_public_id: str
    ) -> AResult[UserLikedMediaRow]:
        """Like a single song by public_id."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=song_public_id,
                media_type_key=MediaTypeEnum.SONG.value,
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting song media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()

        a_result: AResult[UserLikedMediaRow] = await UserSongAccess.add_like(
            session=session, user_id=user_id, media_id=media.id
        )
        if a_result.is_not_ok():
            logger.error(f"Error liking song. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def unlike_song(
        session: AsyncSession, user_id: int, song_public_id: str
    ) -> AResult[bool]:
        """Unlike a single song by public_id."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=song_public_id,
                media_type_key=MediaTypeEnum.SONG.value,
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting song media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()

        a_result: AResult[bool] = await UserSongAccess.remove_like(
            session=session, user_id=user_id, media_id=media.id
        )
        if a_result.is_not_ok():
            logger.error(f"Error unliking song. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def like_album(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> AResult[List[UserLikedMediaRow]]:
        """Like all songs in an album by public_id."""

        a_result_album_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=album_public_id,
                media_type_key=MediaTypeEnum.ALBUM.value,
            )
        )
        if a_result_album_media.is_not_ok():
            logger.error(f"Error getting album media. {a_result_album_media.info()}")
            return AResult(
                code=a_result_album_media.code(), message=a_result_album_media.message()
            )

        album_media: CoreMediaRow = a_result_album_media.result()

        provider: BaseProvider | None = providers.find_provider(album_media.provider_id)
        if provider is None:
            logger.error(
                f"No provider found for provider_id {album_media.provider_id}."
            )
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for album"
            )

        a_result_album: AResult[BaseAlbumWithSongsResponse] = (
            await provider.get_album_async(session=session, public_id=album_public_id)
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from provider. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: BaseAlbumWithSongsResponse = a_result_album.result()
        liked_songs: List[UserLikedMediaRow] = []

        for song in album.songs:
            a_result_song_media: AResult[CoreMediaRow] = (
                await MediaAccess.get_media_from_public_id_async(
                    session=session,
                    public_id=song.publicId,
                    media_type_key=MediaTypeEnum.SONG.value,
                )
            )
            if a_result_song_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song.publicId}. Skipping."
                )
                continue

            song_media: CoreMediaRow = a_result_song_media.result()

            a_result_like: AResult[UserLikedMediaRow] = await UserSongAccess.add_like(
                session=session, user_id=user_id, media_id=song_media.id
            )
            if a_result_like.is_ok():
                liked_songs.append(a_result_like.result())

        return AResult(code=AResultCode.OK, message="OK", result=liked_songs)

    @staticmethod
    async def unlike_album(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> AResult[int]:
        """Unlike all songs in an album by public_id."""

        a_result_album_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=album_public_id,
                media_type_key=MediaTypeEnum.ALBUM.value,
            )
        )
        if a_result_album_media.is_not_ok():
            logger.error(f"Error getting album media. {a_result_album_media.info()}")
            return AResult(
                code=a_result_album_media.code(), message=a_result_album_media.message()
            )

        album_media: CoreMediaRow = a_result_album_media.result()

        provider: BaseProvider | None = providers.find_provider(album_media.provider_id)
        if provider is None:
            logger.error(
                f"No provider found for provider_id {album_media.provider_id}."
            )
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for album"
            )

        a_result_album: AResult[BaseAlbumWithSongsResponse] = (
            await provider.get_album_async(session=session, public_id=album_public_id)
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from provider. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: BaseAlbumWithSongsResponse = a_result_album.result()
        unliked_count: int = 0

        for song in album.songs:
            a_result_song_media: AResult[CoreMediaRow] = (
                await MediaAccess.get_media_from_public_id_async(
                    session=session,
                    public_id=song.publicId,
                    media_type_key=MediaTypeEnum.SONG.value,
                )
            )
            if a_result_song_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song.publicId}. Skipping."
                )
                continue

            song_media: CoreMediaRow = a_result_song_media.result()

            a_result_unlike: AResult[bool] = await UserSongAccess.remove_like(
                session=session, user_id=user_id, media_id=song_media.id
            )
            if a_result_unlike.is_ok():
                unliked_count += 1

        return AResult(code=AResultCode.OK, message="OK", result=unliked_count)

    @staticmethod
    async def like_songs(
        session: AsyncSession, user_id: int, song_public_ids: List[str]
    ) -> AResult[List[UserLikedMediaRow]]:
        """Like multiple songs by public_ids."""

        liked_songs: List[UserLikedMediaRow] = []

        for song_public_id in song_public_ids:
            a_result_media: AResult[CoreMediaRow] = (
                await MediaAccess.get_media_from_public_id_async(
                    session=session,
                    public_id=song_public_id,
                    media_type_key=MediaTypeEnum.SONG.value,
                )
            )
            if a_result_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song_public_id}. Skipping."
                )
                continue

            media: CoreMediaRow = a_result_media.result()

            a_result: AResult[UserLikedMediaRow] = await UserSongAccess.add_like(
                session=session, user_id=user_id, media_id=media.id
            )
            if a_result.is_ok():
                liked_songs.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=liked_songs)

    @staticmethod
    async def unlike_songs(
        session: AsyncSession, user_id: int, song_public_ids: List[str]
    ) -> AResult[int]:
        """Unlike multiple songs by public_ids."""

        unliked_count: int = 0

        for song_public_id in song_public_ids:
            a_result_media: AResult[CoreMediaRow] = (
                await MediaAccess.get_media_from_public_id_async(
                    session=session,
                    public_id=song_public_id,
                    media_type_key=MediaTypeEnum.SONG.value,
                )
            )
            if a_result_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song_public_id}. Skipping."
                )
                continue

            media: CoreMediaRow = a_result_media.result()

            a_result: AResult[bool] = await UserSongAccess.remove_like(
                session=session, user_id=user_id, media_id=media.id
            )
            if a_result.is_ok():
                unliked_count += 1

        return AResult(code=AResultCode.OK, message="OK", result=unliked_count)

    @staticmethod
    async def get_user_liked_song_public_ids(
        session: AsyncSession, user_id: int
    ) -> AResult[List[str]]:
        """Get all liked song public IDs for a user."""

        a_result: AResult[List[str]] = (
            await UserSongAccess.get_user_liked_song_public_ids(
                session=session, user_id=user_id
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting liked songs. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
