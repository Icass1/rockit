import asyncio
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.responses.basePlaylistResponse import BasePlaylistResponse
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode

from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.core.access.db.ormModels.user_queue import UserQueueRow
from backend.core.access.db.ormModels.user_seeks import UserSeeksRow
from backend.core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from backend.core.access.db.ormModels.user_media_clicked import UserMediaClickedRow

from backend.core.access.userAccess import UserAccess
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.languageAccess import LanguageAccess
from backend.core.access.userQueueAccess import UserQueueAccess
from backend.core.access.userLikedMediaAccess import UserLikedMediaAccess

from backend.core.framework.provider.baseProvider import BaseProvider
from backend.core.framework import providers

from backend.core.responses.queueResponse import QueueResponse, QueueResponseItem
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.access.db.ormModels.language import LanguageRow
from backend.utils.backendUtils import time_it

logger = getLogger(__name__)


class User:
    @staticmethod
    async def get_user_queue_async(
        session: AsyncSession, user_id: int
    ) -> AResult[QueueResponse]:
        """Get the user's queue with all songs."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        current_queue_media_id: int | None = user.current_queue_media_id

        a_result_queue: AResult[List[UserQueueRow]] = (
            await UserQueueAccess.get_all_user_queues(session=session, user_id=user_id)
        )
        if a_result_queue.is_not_ok():
            logger.error(f"Error getting user queue. {a_result_queue.info()}")
            return AResult(code=a_result_queue.code(), message=a_result_queue.message())

        queue_items: List[UserQueueRow] = a_result_queue.result()

        queue: List[QueueResponseItem] = []
        for item in queue_items:
            media: CoreMediaRow = item.media
            provider: BaseProvider | None = providers.find_provider(
                provider_id=media.provider_id
            )
            if provider is None:
                logger.error(f"No provider found for provider_id {media.provider_id}.")
                continue

            list_public_id: str = ""

            if media.media_type_key == MediaTypeEnum.VIDEO.value:
                a_result_video: AResult[BaseVideoResponse] = (
                    await provider.get_video_async(
                        session=session, public_id=media.public_id
                    )
                )
                if a_result_video.is_not_ok():
                    logger.error(
                        f"Error getting video from provider. {a_result_video.info()}"
                    )
                    continue

                video: BaseVideoResponse = a_result_video.result()

                queue.append(
                    QueueResponseItem(
                        queueMediaId=item.queue_media_id,
                        listPublicId=list_public_id,
                        media=video,
                    )
                )
            elif media.media_type_key == MediaTypeEnum.SONG.value:
                a_result_song: AResult[BaseSongWithAlbumResponse] = (
                    await provider.get_song_async(
                        session=session, public_id=media.public_id
                    )
                )
                if a_result_song.is_not_ok():
                    logger.error(
                        f"Error getting song from provider. {a_result_song.info()}"
                    )
                    continue

                song: BaseSongWithAlbumResponse = a_result_song.result()

                queue.append(
                    QueueResponseItem(
                        queueMediaId=item.queue_media_id,
                        listPublicId=song.album.publicId,
                        media=song,
                    )
                )
            else:
                logger.warning(
                    f"Unsupported media type {MediaTypeEnum(media.media_type_key)} in user queue. Skipping."
                )

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=QueueResponse(
                currentQueueMediaId=current_queue_media_id, queue=queue
            ),
        )

    @staticmethod
    @time_it
    async def get_user_library_medias(
        session: AsyncSession, user_id: int
    ) -> AResult[
        List[
            BaseAlbumWithoutSongsResponse
            | BasePlaylistResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
        ]
    ]:
        """Get all media in user's library."""

        a_result_medias: AResult[
            List[Tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]]
        ] = await UserAccess.get_user_library_medias(session=session, user_id=user_id)

        if a_result_medias.is_not_ok():
            logger.error(f"Error getting user media. {a_result_medias.info()}")
            return AResult(
                code=a_result_medias.code(), message=a_result_medias.message()
            )

        library_medias: List[
            BaseAlbumWithoutSongsResponse
            | BasePlaylistResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
        ] = []

        logger.debug(
            f"Found {len(a_result_medias.result())} media items in user library."
        )

        async def process_media(
            media: CoreMediaRow, provider_row: ProviderRow
        ) -> (
            BaseAlbumWithoutSongsResponse
            | BasePlaylistResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
            | None
        ):
            provider_instance: BaseProvider | None = providers.find_provider(
                provider_id=provider_row.id
            )

            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider_row.id}.")
                return None

            if media.media_type_key == MediaTypeEnum.ALBUM.value:
                a_result_album: AResult[BaseAlbumWithSongsResponse] = (
                    await provider_instance.get_album_async(
                        session=session, public_id=media.public_id
                    )
                )
                if a_result_album.is_not_ok():
                    logger.error(
                        f"Error getting album from provider. {a_result_album.info()}"
                    )
                    return None

                return a_result_album.result()

            elif media.media_type_key == MediaTypeEnum.PLAYLIST.value:
                a_result_playlist: AResult[BasePlaylistResponse] = (
                    await provider_instance.get_playlist_async(
                        session=session, user_id=user_id, public_id=media.public_id
                    )
                )
                if a_result_playlist.is_not_ok():
                    logger.error(
                        f"Error getting playlist from provider. {a_result_playlist.info()}"
                    )
                    return None

                return a_result_playlist.result()

            elif media.media_type_key == MediaTypeEnum.SONG.value:
                a_result_song: AResult[BaseSongWithAlbumResponse] = (
                    await provider_instance.get_song_async(
                        session=session, public_id=media.public_id
                    )
                )
                if a_result_song.is_not_ok():
                    logger.error(
                        f"Error getting song from provider. {a_result_song.info()}"
                    )
                    return None

                return a_result_song.result()

            elif media.media_type_key == MediaTypeEnum.VIDEO.value:
                a_result_video: AResult[BaseVideoResponse] = (
                    await provider_instance.get_video_async(
                        session=session, public_id=media.public_id
                    )
                )
                if a_result_video.is_not_ok():
                    logger.error(
                        f"Error getting video from provider. {a_result_video.info()}"
                    )
                    return None

                return a_result_video.result()

            return None

        results = await asyncio.gather(
            *[
                process_media(media, provider)
                for _, media, provider in a_result_medias.result()
            ]
        )

        library_medias = [r for r in results if r is not None]

        return AResult(code=AResultCode.OK, message="OK", result=library_medias)

    @staticmethod
    async def add_media_to_library(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> AResult[UserLibraryMediaRow]:
        """Add any media to user's library by public_id."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=media_public_id,
                media_type_keys=None,
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        a_result_user_media: AResult[UserLibraryMediaRow] = (
            await UserAccess.add_user_library_media(
                session=session, user_id=user_id, media_id=a_result_media.result().id
            )
        )
        if a_result_user_media.is_not_ok():
            logger.error(f"Error adding media to library. {a_result_user_media.info()}")
            return AResult(
                code=a_result_user_media.code(), message=a_result_user_media.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_user_media.result()
        )

    @staticmethod
    async def remove_media_from_library(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> AResult[bool]:
        """Remove media from user's library by public_id."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=media_public_id,
                media_type_keys=None,
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        a_result_removed: AResult[bool] = await UserAccess.remove_user_library_media(
            session=session, user_id=user_id, media_id=a_result_media.result().id
        )
        if a_result_removed.is_not_ok():
            logger.error(
                f"Error removing media from library. {a_result_removed.info()}"
            )
            return AResult(
                code=a_result_removed.code(), message=a_result_removed.message()
            )

        return AResult(
            code=AResultCode.OK, message="OK", result=a_result_removed.result()
        )

    @staticmethod
    async def unlike_media(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> AResult[bool]:
        """Unlike a single song by public_id."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=media_public_id,
                media_type_keys=[MediaTypeEnum.SONG],
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting song media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()

        a_result: AResult[bool] = await UserLikedMediaAccess.remove_like_async(
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
                media_type_keys=[MediaTypeEnum.ALBUM],
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
                    media_type_keys=[MediaTypeEnum.SONG],
                )
            )
            if a_result_song_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song.publicId}. Skipping."
                )
                continue

            song_media: CoreMediaRow = a_result_song_media.result()

            a_result_like: AResult[UserLikedMediaRow] = (
                await UserLikedMediaAccess.add_like_async(
                    session=session, user_id=user_id, media_id=song_media.id
                )
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
                media_type_keys=[MediaTypeEnum.ALBUM],
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
                    media_type_keys=[MediaTypeEnum.SONG],
                )
            )
            if a_result_song_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song.publicId}. Skipping."
                )
                continue

            song_media: CoreMediaRow = a_result_song_media.result()

            a_result_unlike: AResult[bool] = (
                await UserLikedMediaAccess.remove_like_async(
                    session=session, user_id=user_id, media_id=song_media.id
                )
            )
            if a_result_unlike.is_ok():
                unliked_count += 1

        return AResult(code=AResultCode.OK, message="OK", result=unliked_count)

    @staticmethod
    async def like_media_async(
        session: AsyncSession, user_id: int, public_ids: List[str]
    ) -> AResult[List[UserLikedMediaRow]]:
        """Like multiple songs by public_ids."""

        liked_media: List[UserLikedMediaRow] = []

        for media_public_id in public_ids:
            a_result_media: AResult[CoreMediaRow] = (
                await MediaAccess.get_media_from_public_id_async(
                    session=session, public_id=media_public_id, media_type_keys=None
                )
            )
            if a_result_media.is_not_ok():
                logger.warning(f"Could not find media {media_public_id}. Skipping.")
                continue

            media: CoreMediaRow = a_result_media.result()

            a_result: AResult[UserLikedMediaRow] = (
                await UserLikedMediaAccess.add_like_async(
                    session=session, user_id=user_id, media_id=media.id
                )
            )
            if a_result.is_ok():
                liked_media.append(a_result.result())

        return AResult(code=AResultCode.OK, message="OK", result=liked_media)

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
                    media_type_keys=[MediaTypeEnum.SONG],
                )
            )
            if a_result_media.is_not_ok():
                logger.warning(
                    f"Could not find media for song {song_public_id}. Skipping."
                )
                continue

            media: CoreMediaRow = a_result_media.result()

            a_result: AResult[bool] = await UserLikedMediaAccess.remove_like_async(
                session=session, user_id=user_id, media_id=media.id
            )
            if a_result.is_ok():
                unliked_count += 1

        return AResult(code=AResultCode.OK, message="OK", result=unliked_count)

    @staticmethod
    async def get_user_liked_media_public_ids(
        session: AsyncSession, user_id: int
    ) -> AResult[List[str]]:
        """Get all liked song public IDs for a user."""

        a_result: AResult[List[str]] = (
            await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
                session=session, user_id=user_id
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting liked songs. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def update_user_current_media(
        session: AsyncSession, user_id: int, queue_media_id: int, media_public_id: str
    ) -> AResult[bool]:
        """Update user's current queue media after validating the public ID matches."""

        a_result_queue_item: AResult[UserQueueRow] = (
            await UserQueueAccess.get_queue_item_by_queue_media_id(
                session=session, user_id=user_id, queue_media_id=queue_media_id
            )
        )
        if a_result_queue_item.is_not_ok():
            logger.error(f"Error getting queue item. {a_result_queue_item.info()}")
            return AResult(
                code=a_result_queue_item.code(), message=a_result_queue_item.message()
            )

        queue_item: UserQueueRow = a_result_queue_item.result()

        if queue_item.media.public_id != media_public_id:
            logger.error(
                f"Media public ID mismatch. Expected {queue_item.media.public_id}, got {media_public_id}"
            )
            return AResult(
                code=AResultCode.VALIDATION_ERROR, message="Media public ID mismatch"
            )

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.current_queue_media_id = queue_media_id

        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def update_user_current_time(
        session: AsyncSession, user_id: int, current_time_ms: int
    ) -> AResult[bool]:
        """Update user's current playback time."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.current_time_ms = current_time_ms

        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_user_current_time_seek_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_from: float,
        time_to: float,
    ) -> AResultCode:
        a_result: AResult[UserSeeksRow] = (
            await UserAccess.add_user_current_time_seek_async(
                session=session,
                user_id=user_id,
                media_id=media_id,
                time_from=time_from,
                time_to=time_to,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding user current time seek. {a_result.info()}")
            return AResultCode(code=a_result.code(), message=a_result.message())

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def save_user_queue_async(
        session: AsyncSession,
        user_id: int,
        queue_items: List[Tuple[int, int]],
        queue_type: QueueTypeEnum,
    ) -> AResultCode:
        a_result: AResult[bool] = await UserQueueAccess.save_user_queue_async(
            session=session,
            user_id=user_id,
            queue_items=queue_items,
            queue_type=queue_type,
        )

        if a_result.is_not_ok():
            logger.error(f"Error saving user queue. {a_result.info()}")
            return AResultCode(code=a_result.code(), message=a_result.message())

        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    async def update_lang_async(
        session: AsyncSession, user_id: int, lang_code: str
    ) -> AResult[bool]:
        """Update the user's language by language code."""

        a_result_lang: AResult[LanguageRow] = (
            await LanguageAccess.get_language_from_code(
                session=session, lang_code=lang_code
            )
        )
        if a_result_lang.is_not_ok():
            logger.error(f"Error getting language. {a_result_lang.info()}")
            return AResult(
                code=AResultCode.BAD_REQUEST, message="Invalid language code"
            )

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.lang_id = a_result_lang.result().id
        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def update_crossfade_async(
        session: AsyncSession, user_id: int, crossfade_ms: int
    ) -> AResult[bool]:
        """Update the user's crossfade setting."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.cross_fade_ms = crossfade_ms
        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def update_password_async(
        session: AsyncSession, user_id: int, password_hash: str
    ) -> AResult[bool]:
        """Update the user's password hash."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.password_hash = password_hash
        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def toggle_random_queue_async(
        session: AsyncSession, user_id: int
    ) -> AResult[bool]:
        """Toggle the user's random queue mode."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.queue_type_key = 2 if user.queue_type_key == 1 else 1
        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def cycle_repeat_mode_async(
        session: AsyncSession, user_id: int
    ) -> AResult[bool]:
        """Cycle the user's repeat mode."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        current_mode: int = user.repeat_mode_key
        user.repeat_mode_key = 1 if current_mode >= 3 else current_mode + 1
        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_user_media_clicked_async(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> AResult[bool]:
        """Record that a user clicked on a media item."""

        a_result_media: AResult[CoreMediaRow] = (
            await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=media_public_id,
                media_type_keys=None,
            )
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return AResult(code=a_result_media.code(), message=a_result_media.message())

        a_result: AResult[UserMediaClickedRow] = (
            await UserAccess.add_user_media_clicked_async(
                session=session,
                user_id=user_id,
                media_id=a_result_media.result().id,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding media click. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=True)
