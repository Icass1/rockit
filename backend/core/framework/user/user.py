import asyncio
from collections import defaultdict
from typing import Any, List, Union
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import time_it

from backend.core.aResult import AResult, AResultCode

from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.enums.skipDirectionEnum import SkipDirectionEnum

from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.core.access.db.ormModels.language import LanguageRow
from backend.core.access.db.ormModels.user_queue import UserQueueRow
from backend.core.access.db.ormModels.user_seeks import UserSeeksRow
from backend.core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from backend.core.access.db.ormModels.user_media_clicked import UserMediaClickedRow
from backend.core.access.db.ormModels.user_skipped_media import UserSkippedMediaRow
from backend.core.access.db.ormModels.user_media_listened import UserMediaListenedRow
from backend.core.access.db.ormModels.user_media_listen_interval import (
    UserMediaListenIntervalRow,
)

from backend.core.access.userAccess import UserAccess
from backend.core.access.mediaAccess import MediaAccess
from backend.core.access.languageAccess import LanguageAccess
from backend.core.access.userQueueAccess import UserQueueAccess
from backend.core.access.userLikedMediaAccess import UserLikedMediaAccess

from backend.core.framework import providers
from backend.core.framework.models.queue import QueueItem
from backend.core.framework.models.queueTask import (
    LibraryTask,
    QueueGroupItem,
    QueueTask,
)
from backend.core.framework.websocket.sendToUser import SendToUser
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.queueResponse import QueueResponse, QueueResponseItem
from backend.core.responses.libraryMediaAddedMessage import LibraryMediaAddedMessage
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.libraryMediaRemovedMessage import LibraryMediaRemovedMessage
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.baseVideoResponse import BaseVideoResponse
from backend.core.responses.baseAlbumWithoutSongsResponse import (
    BaseAlbumWithoutSongsResponse,
)
from backend.core.responses.basePlaylistWithoutMediasResponse import (
    BasePlaylistWithoutMediasResponse,
)

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
        current_queue_id: int | None = user.current_queue_id

        a_result_queue: AResult[List[UserQueueRow]] = (
            await UserQueueAccess.get_all_user_queues(session=session, user_id=user_id)
        )
        if a_result_queue.is_not_ok():
            logger.error(f"Error getting user queue. {a_result_queue.info()}")
            return AResult(code=a_result_queue.code(), message=a_result_queue.message())

        queue_items: List[UserQueueRow] = a_result_queue.result()

        # Track original order to restore after grouping
        original_order: dict[int, int] = {
            item.queue_id: idx for idx, item in enumerate(queue_items)
        }

        # Group queue items by (provider_id, media_type_key)
        groups: dict[tuple[int, int], list[QueueGroupItem]] = defaultdict(list)
        for item in queue_items:
            media: CoreMediaRow = item.media
            groups[(media.provider_id, media.media_type_key)].append(
                QueueGroupItem(
                    queue_id=item.queue_id,
                    public_id=media.public_id,
                    sorted_index=item.sorted_index,
                    random_index=item.random_index,
                )
            )

        # Collect all coroutines to run in parallel
        tasks: List[QueueTask] = []
        for (provider_id, media_type_key), items in groups.items():
            provider_instance: BaseMediaProvider | None = providers.find_media_provider(
                provider_id=provider_id
            )
            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider_id}.")
                continue

            public_ids = [qi.public_id for qi in items]

            if media_type_key == MediaTypeEnum.VIDEO.value:
                task = provider_instance.get_videos_async(
                    session=session, public_ids=public_ids
                )
                tasks.append(
                    QueueTask(
                        coroutine=task,
                        media_type="videos",
                        provider_id=provider_id,
                        items=items,
                    )
                )
            elif media_type_key == MediaTypeEnum.SONG.value:
                task = provider_instance.get_songs_async(
                    session=session, public_ids=public_ids
                )
                tasks.append(
                    QueueTask(
                        coroutine=task,
                        media_type="songs",
                        provider_id=provider_id,
                        items=items,
                    )
                )
            else:
                logger.warning(
                    f"Unsupported media type {MediaTypeEnum(media_type_key)} in user queue. Skipping."
                )

        # Run all provider calls in parallel
        queue: List[QueueResponseItem] = []
        if tasks:
            results: List[Union[AResult[Any], BaseException]] = await asyncio.gather(
                *(task.coroutine for task in tasks), return_exceptions=True
            )
            for task, result in zip(tasks, results):
                if isinstance(result, BaseException):
                    logger.error(
                        f"Error getting {task.media_type} from provider {task.provider_id}: {result}"
                    )
                    continue

                a_result: AResult[Any] = result
                if a_result.is_not_ok():
                    logger.error(
                        f"Error getting {task.media_type} from provider {task.provider_id}. {a_result.info()}"
                    )
                    continue

                media_list: List[Any] = a_result.result()
                # Map results back to queue items
                media_dict: dict[str, Any] = {
                    media.publicId: media for media in media_list
                }
                for qi in task.items:
                    media_item: Any = media_dict.get(qi.public_id)
                    if media_item is None:
                        logger.warning(
                            f"Media {qi.public_id} not found in provider response."
                        )
                        continue

                    queue.append(
                        QueueResponseItem(
                            queueMediaId=qi.queue_id,
                            listPublicId=None,
                            media=media_item,
                            sortedIndex=qi.sorted_index,
                            randomIndex=qi.random_index,
                        )
                    )

        # Restore original database order
        queue.sort(key=lambda item: original_order.get(item.queueMediaId, 0))

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=QueueResponse(
                currentQueueMediaId=current_queue_id,
                queue=queue,
                queueType=QueueTypeEnum(user.queue_type_key),
            ),
        )

    @staticmethod
    @time_it
    async def get_user_library_medias(
        session: AsyncSession, user_id: int
    ) -> AResult[
        List[
            BaseAlbumWithoutSongsResponse
            | BasePlaylistWithoutMediasResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
        ]
    ]:
        """Get all media in user's library."""

        a_result_medias: AResult[
            list[tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]]
        ] = await UserAccess.get_user_library_medias(session=session, user_id=user_id)

        if a_result_medias.is_not_ok():
            logger.error(f"Error getting user media. {a_result_medias.info()}")
            return AResult(
                code=a_result_medias.code(), message=a_result_medias.message()
            )

        items = a_result_medias.result()
        logger.debug(f"Found {len(items)} media items in user library.")

        # Group by (provider_id, media_type_key) so each provider is called once with all IDs
        groups: dict[tuple[int, int], list[str]] = defaultdict(list)
        for _, media, provider_row in items:
            groups[(provider_row.id, media.media_type_key)].append(media.public_id)

        library_medias: List[
            BaseAlbumWithoutSongsResponse
            | BasePlaylistWithoutMediasResponse
            | BaseSongWithAlbumResponse
            | BaseVideoResponse
        ] = []

        # Collect all coroutines to run in parallel
        tasks: List[LibraryTask] = []
        for (provider_id, media_type_key), public_ids in groups.items():
            provider_instance: BaseMediaProvider | None = providers.find_media_provider(
                provider_id=provider_id
            )
            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider_id}.")
                continue

            if media_type_key == MediaTypeEnum.ALBUM.value:
                task = provider_instance.get_albums_async(
                    session=session, public_ids=public_ids
                )
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="albums",
                        provider_id=provider_id,
                    )
                )
            elif media_type_key == MediaTypeEnum.PLAYLIST.value:
                task = provider_instance.get_playlists_without_medias_async(
                    session=session, user_id=user_id, public_ids=public_ids
                )
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="playlists",
                        provider_id=provider_id,
                    )
                )
            elif media_type_key == MediaTypeEnum.SONG.value:
                task = provider_instance.get_songs_async(
                    session=session, public_ids=public_ids
                )
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="songs",
                        provider_id=provider_id,
                    )
                )
            elif media_type_key == MediaTypeEnum.VIDEO.value:
                task = provider_instance.get_videos_async(
                    session=session, public_ids=public_ids
                )
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="videos",
                        provider_id=provider_id,
                    )
                )
            else:
                logger.warning(
                    f"Unsupported media type {MediaTypeEnum(media_type_key)} in user library. Skipping."
                )

        # Run all provider calls in parallel
        if tasks:
            results: List[Union[AResult[Any], BaseException]] = await asyncio.gather(
                *(task.coroutine for task in tasks), return_exceptions=True
            )
            for task, result in zip(tasks, results):
                if isinstance(result, BaseException):
                    logger.error(
                        f"Error getting {task.media_type} from provider {task.provider_id}: {result}"
                    )
                    continue

                a_result: AResult[Any] = result
                if a_result.is_not_ok():
                    logger.error(
                        f"Error getting {task.media_type} from provider {task.provider_id}. {a_result.info()}"
                    )
                    continue

                library_medias.extend(a_result.result())

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

        await SendToUser.send_to_user(
            user_id=user_id,
            message=LibraryMediaAddedMessage(publicId=media_public_id),
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

        await SendToUser.send_to_user(
            user_id=user_id,
            message=LibraryMediaRemovedMessage(publicId=media_public_id),
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

        provider: BaseMediaProvider | None = providers.find_media_provider(
            album_media.provider_id
        )
        if provider is None:
            logger.error(
                f"No provider found for provider_id {album_media.provider_id}."
            )
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for album"
            )

        a_result_album: AResult[List[BaseAlbumWithSongsResponse]] = (
            await provider.get_albums_async(
                session=session, public_ids=[album_public_id]
            )
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from provider. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: BaseAlbumWithSongsResponse = a_result_album.result()[0]
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

        provider: BaseMediaProvider | None = providers.find_media_provider(
            album_media.provider_id
        )
        if provider is None:
            logger.error(
                f"No provider found for provider_id {album_media.provider_id}."
            )
            return AResult(
                code=AResultCode.NOT_FOUND, message="Provider not found for album"
            )

        a_result_album: AResult[List[BaseAlbumWithSongsResponse]] = (
            await provider.get_albums_async(
                session=session, public_ids=[album_public_id]
            )
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from provider. {a_result_album.info()}")
            return AResult(code=a_result_album.code(), message=a_result_album.message())

        album: BaseAlbumWithSongsResponse = a_result_album.result()[0]
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
        session: AsyncSession,
        user_id: int,
        queue_id: int,
        media_public_id: str,
    ) -> AResult[bool]:
        """Update user's current queue media after validating the public ID matches."""

        a_result_queue_item: AResult[UserQueueRow] = (
            await UserQueueAccess.get_queue_item_by_queue_id(
                session=session,
                user_id=user_id,
                queue_id=queue_id,
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
        user.current_queue_id = queue_id

        await session.commit()

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def update_user_current_time(
        session: AsyncSession, user_id: int, current_time_ms: int, media_public_id: str
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
        queue_items: List[QueueItem],
    ) -> AResultCode:
        a_result: AResult[bool] = await UserQueueAccess.save_user_queue_async(
            session=session,
            user_id=user_id,
            queue_items=queue_items,
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
    async def update_queue_type_async(
        session: AsyncSession, user_id: int, queue_type: QueueTypeEnum
    ) -> AResult[bool]:
        """Set the user's queue type directly."""

        a_result_user: AResult[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return AResult(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        user.queue_type_key = queue_type.value
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

    @staticmethod
    async def add_user_skipped_media_async(
        session: AsyncSession,
        user_id: int,
        media_public_id: str,
        direction: SkipDirectionEnum,
    ) -> AResult[bool]:
        """Record that a user skipped a media item."""

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

        a_result: AResult[UserSkippedMediaRow] = (
            await UserAccess.add_user_skipped_media_async(
                session=session,
                user_id=user_id,
                media_id=a_result_media.result().id,
                skip_direction_key=direction.value,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding media skip. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_user_media_listened_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> AResult[bool]:
        """Record that a user has listened to a media item (>=90% of song)."""

        a_result: AResult[UserMediaListenedRow] = (
            await UserAccess.add_user_media_listened_async(
                session=session,
                user_id=user_id,
                media_id=media_id,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding media listened. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    async def record_media_listen_interval_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_ms_start: int,
        time_ms_end: int,
    ) -> AResult[UserMediaListenIntervalRow]:
        """Insert a new listen interval and return the created row."""

        a_result: AResult[UserMediaListenIntervalRow] = (
            await UserAccess.add_user_media_listen_interval_async(
                session=session,
                user_id=user_id,
                media_id=media_id,
                time_ms_start=time_ms_start,
                time_ms_end=time_ms_end,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error recording listen interval. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def update_media_listen_interval_end_async(
        session: AsyncSession,
        interval_id: int,
        time_ms_end: int,
    ) -> AResultCode:
        """Update the end time of an existing open listen interval."""

        a_result: AResultCode = (
            await UserAccess.update_user_media_listen_interval_end_async(
                session=session,
                interval_id=interval_id,
                time_ms_end=time_ms_end,
            )
        )
        if a_result.is_not_ok():
            logger.error(f"Error updating listen interval end. {a_result.info()}")
            return AResultCode(code=a_result.code(), message=a_result.message())

        return AResultCode(code=AResultCode.OK, message="OK")
