from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.language import LanguageRow
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.provider import ProviderRow
from core.access.db.ormModels.user import UserRow
from core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from core.access.db.ormModels.user_liked_media import UserLikedMediaRow
from core.access.db.ormModels.user_media_clicked import UserMediaClickedRow
from core.access.db.ormModels.user_media_listen_interval import (
    UserMediaListenIntervalRow,
)
from core.access.db.ormModels.user_media_listened import UserMediaListenedRow
from core.access.db.ormModels.user_queue import UserQueueRow
from core.access.db.ormModels.user_seeks import UserSeeksRow
from core.access.db.ormModels.user_skipped_media import UserSkippedMediaRow
from core.access.languageAccess import LanguageAccess
from core.access.mediaAccess import MediaAccess
from core.access.userAccess import UserAccess
from core.access.userLikedMediaAccess import UserLikedMediaAccess
from core.access.userQueueAccess import UserQueueAccess
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.enums.queueTypeEnum import QueueTypeEnum
from core.enums.skipDirectionEnum import SkipDirectionEnum
from core.framework import providers
from core.framework.models.queue import QueueItem
from core.framework.models.queueTask import (
    LibraryTask,
)
from core.framework.provider.baseMediaProvider import BaseMediaProvider
from core.framework.websocket.sendToUser import SendToUser
from core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from core.responses.libraryMediaAddedMessage import LibraryMediaAddedMessage
from core.responses.libraryMediaRemovedMessage import LibraryMediaRemovedMessage
from core.responses.queueResponse import QueueResponse, QueueResponseItem
from core.types.libraryMediaTypes import LibraryMediaItem, LibraryResponseItem
from core.utils.timeIt import time_it
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class User:
    @staticmethod
    async def get_user_queue_async(session: AsyncSession, user_id: int) -> Result[QueueResponse]:
        """Get the user's queue with all songs."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        user: UserRow = a_result_user.result()
        current_queue_id: int | None = user.current_queue_id

        a_result_queue: Result[list[UserQueueRow]] = await UserQueueAccess.get_all_user_queues(
            session=session, user_id=user_id
        )
        if a_result_queue.is_not_ok():
            logger.error(f"Error getting user queue. {a_result_queue.info()}")
            return Result(code=a_result_queue.code(), message=a_result_queue.message())

        queue_items: list[UserQueueRow] = a_result_queue.result()

        from core.access.collectionAccess import CollectionAccess
        from core.framework.media.collection import Collection

        ids = {item.media_id for item in queue_items} | {
            item.list_media_id for item in queue_items if item.list_media_id is not None
        }
        identifiers = await CollectionAccess.public_ids_async(session=session, ids=list(ids))
        if identifiers.is_not_ok():
            logger.error(f"Error resolving queue identifiers. {identifiers.info()}")
            return Result(code=identifiers.code(), message=identifiers.message())
        public_ids = identifiers.result()
        records = await CollectionAccess.records_async(
            session=session,
            public_ids=list({item.media.public_id for item in queue_items}),
            user_id=user_id,
        )
        if records.is_not_ok():
            logger.error(f"Error resolving queue metadata. {records.info()}")
            return Result(code=records.code(), message=records.message())
        hydrated = await Collection.hydrate_async(session=session, records=records.result())
        if hydrated.is_not_ok():
            logger.error(f"Error hydrating queue. {hydrated.info()}")
            return Result(code=hydrated.code(), message=hydrated.message())
        medias = hydrated.result()
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=QueueResponse(
                currentQueueMediaId=current_queue_id,
                queueType=QueueTypeEnum(user.queue_type_key),
                queue=[
                    QueueResponseItem(
                        queueMediaId=item.queue_id,
                        listPublicId=(
                            public_ids.get(item.list_media_id)
                            if item.list_media_id is not None
                            else None
                        ),
                        media=medias[item.media.public_id],
                        sortedIndex=item.sorted_index,
                        randomIndex=item.random_index,
                    )
                    for item in queue_items
                    if item.media.public_id in medias
                ],
            ),
        )

    @staticmethod
    @time_it
    async def get_user_library_medias(
        session: AsyncSession, user_id: int
    ) -> Result[list[LibraryMediaItem]]:
        """Get all media in user's library."""
        a_result_medias: Result[
            list[tuple[UserLibraryMediaRow, CoreMediaRow, ProviderRow]]
        ] = await UserAccess.get_user_library_medias(session=session, user_id=user_id)

        if a_result_medias.is_not_ok():
            logger.error(f"Error getting user media. {a_result_medias.info()}")
            return Result(code=a_result_medias.code(), message=a_result_medias.message())

        items = a_result_medias.result()
        logger.debug(f"Found {len(items)} media items in user library.")

        # Build date_added map: public_id -> date_added
        date_map: dict[str, datetime] = {}
        for um, media, _ in items:
            date_map[media.public_id] = um.date_added

        # Group by (provider_id, media_type_key) so each provider is called once with all IDs
        groups: dict[tuple[int, int], list[str]] = defaultdict(list)
        for _, media, provider_row in items:
            groups[(provider_row.id, media.media_type_key)].append(media.public_id)

        library_medias: list[LibraryMediaItem] = []

        # Collect all coroutines to run in parallel
        tasks: list[LibraryTask] = []
        for (provider_id, media_type_key), public_ids in groups.items():
            provider_instance: BaseMediaProvider | None = providers.find_media_provider(
                provider_id=provider_id
            )
            if provider_instance is None:
                logger.error(f"No provider found for provider_id {provider_id}.")
                continue

            if media_type_key == MediaTypeEnum.ALBUM.value:
                task = provider_instance.get_albums_async(session=session, public_ids=public_ids)
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
                task = provider_instance.get_songs_async(session=session, public_ids=public_ids)
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="songs",
                        provider_id=provider_id,
                    )
                )
            elif media_type_key == MediaTypeEnum.VIDEO.value:
                task = provider_instance.get_videos_async(session=session, public_ids=public_ids)
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="videos",
                        provider_id=provider_id,
                    )
                )
            elif media_type_key == MediaTypeEnum.RADIO.value:
                task = provider_instance.get_stations_async(session=session, public_ids=public_ids)
                tasks.append(
                    LibraryTask(
                        coroutine=task,
                        media_type="stations",
                        provider_id=provider_id,
                    )
                )
            else:
                logger.warning(
                    f"Unsupported media type {MediaTypeEnum(media_type_key)} in user "
                    f"library. Skipping."
                )

        # Provider calls share one transaction: AsyncSession is not concurrency safe.
        if tasks:
            results: list[Result[Any] | BaseException] = []
            for task in tasks:
                try:
                    results.append(await task.coroutine)
                except Exception as error:
                    results.append(error)
            for task, result in zip(tasks, results):
                if isinstance(result, BaseException):
                    logger.error(
                        f"Error getting {task.media_type} from provider "
                        f"{task.provider_id}: {result}"
                    )
                    continue

                a_result: Result[Any] = result
                if a_result.is_not_ok():
                    logger.error(
                        f"Error getting {task.media_type} from provider "
                        f"{task.provider_id}. {a_result.info()}"
                    )
                    continue

                for item in a_result.result():
                    library_medias.append(
                        LibraryResponseItem(
                            item=item,
                            addedAt=date_map[item.publicId],
                        )
                    )

        return Result(code=ResultCode.OK, message="OK", result=library_medias)

    @staticmethod
    async def add_medias_to_library_async(
        session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[bool]:
        """Save download roots (including whole playlists) with bounded DB queries."""
        found = await MediaAccess.get_medias_from_public_ids_async(
            session=session, public_ids=public_ids, media_type_keys=None
        )
        if found.is_not_ok():
            logger.error(f"Error resolving library media. {found.info()}")
            return Result(code=found.code(), message=found.message())
        medias = found.result()
        if len({media.public_id for media in medias}) != len(set(public_ids)):
            logger.warning("Some requested library media were not found")
            return Result(code=ResultCode.NOT_FOUND, message="Media not found")
        saved = await UserAccess.add_user_library_medias_async(
            session=session, user_id=user_id, media_ids=[media.id for media in medias]
        )
        if saved.is_not_ok():
            logger.error(f"Error saving library media. {saved.info()}")
            return Result(code=saved.code(), message=saved.message())
        for media in medias:
            await SendToUser.send_to_user(
                user_id=user_id,
                message=LibraryMediaAddedMessage(publicId=media.public_id),
            )
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_media_to_library(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> Result[UserLibraryMediaRow]:
        """Add any media to user's library by public_id."""

        a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())

        a_result_user_media: Result[UserLibraryMediaRow] = await UserAccess.add_user_library_media(
            session=session, user_id=user_id, media_id=a_result_media.result().id
        )
        if a_result_user_media.is_not_ok():
            logger.error(f"Error adding media to library. {a_result_user_media.info()}")
            return Result(code=a_result_user_media.code(), message=a_result_user_media.message())

        await SendToUser.send_to_user(
            user_id=user_id,
            message=LibraryMediaAddedMessage(publicId=media_public_id),
        )

        return Result(code=ResultCode.OK, message="OK", result=a_result_user_media.result())

    @staticmethod
    async def remove_media_from_library(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> Result[bool]:
        """Remove media from user's library by public_id."""

        a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())

        a_result_removed: Result[bool] = await UserAccess.remove_user_library_media(
            session=session, user_id=user_id, media_id=a_result_media.result().id
        )
        if a_result_removed.is_not_ok():
            logger.error(f"Error removing media from library. {a_result_removed.info()}")
            return Result(code=a_result_removed.code(), message=a_result_removed.message())

        await SendToUser.send_to_user(
            user_id=user_id,
            message=LibraryMediaRemovedMessage(publicId=media_public_id),
        )

        return Result(code=ResultCode.OK, message="OK", result=a_result_removed.result())

    @staticmethod
    async def unlike_media(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> Result[bool]:
        """Unlike a single song by public_id."""

        a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=[MediaTypeEnum.SONG],
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting song media. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())

        media: CoreMediaRow = a_result_media.result()

        a_result: Result[bool] = await UserLikedMediaAccess.remove_like_async(
            session=session, user_id=user_id, media_id=media.id
        )
        if a_result.is_not_ok():
            logger.error(f"Error unliking song. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def like_album(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> Result[list[UserLikedMediaRow]]:
        """Like all songs in an album by public_id."""

        a_result_album_media: Result[
            CoreMediaRow
        ] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=album_public_id,
            media_type_keys=[MediaTypeEnum.ALBUM],
        )
        if a_result_album_media.is_not_ok():
            logger.error(f"Error getting album media. {a_result_album_media.info()}")
            return Result(code=a_result_album_media.code(), message=a_result_album_media.message())

        album_media: CoreMediaRow = a_result_album_media.result()

        provider: BaseMediaProvider | None = providers.find_media_provider(album_media.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {album_media.provider_id}.")
            return Result(code=ResultCode.NOT_FOUND, message="Provider not found for album")

        a_result_album: Result[list[BaseAlbumWithSongsResponse]] = await provider.get_albums_async(
            session=session, public_ids=[album_public_id]
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from provider. {a_result_album.info()}")
            return Result(code=a_result_album.code(), message=a_result_album.message())

        album: BaseAlbumWithSongsResponse = a_result_album.result()[0]
        liked_songs: list[UserLikedMediaRow] = []

        for song in album.songs:
            a_result_song_media: Result[
                CoreMediaRow
            ] = await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=song.publicId,
                media_type_keys=[MediaTypeEnum.SONG],
            )
            if a_result_song_media.is_not_ok():
                logger.warning(f"Could not find media for song {song.publicId}. Skipping.")
                continue

            song_media: CoreMediaRow = a_result_song_media.result()

            a_result_like: Result[UserLikedMediaRow] = await UserLikedMediaAccess.add_like_async(
                session=session, user_id=user_id, media_id=song_media.id
            )
            if a_result_like.is_ok():
                liked_songs.append(a_result_like.result())

        return Result(code=ResultCode.OK, message="OK", result=liked_songs)

    @staticmethod
    async def unlike_album(
        session: AsyncSession, user_id: int, album_public_id: str
    ) -> Result[int]:
        """Unlike all songs in an album by public_id."""

        a_result_album_media: Result[
            CoreMediaRow
        ] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=album_public_id,
            media_type_keys=[MediaTypeEnum.ALBUM],
        )
        if a_result_album_media.is_not_ok():
            logger.error(f"Error getting album media. {a_result_album_media.info()}")
            return Result(code=a_result_album_media.code(), message=a_result_album_media.message())

        album_media: CoreMediaRow = a_result_album_media.result()

        provider: BaseMediaProvider | None = providers.find_media_provider(album_media.provider_id)
        if provider is None:
            logger.error(f"No provider found for provider_id {album_media.provider_id}.")
            return Result(code=ResultCode.NOT_FOUND, message="Provider not found for album")

        a_result_album: Result[list[BaseAlbumWithSongsResponse]] = await provider.get_albums_async(
            session=session, public_ids=[album_public_id]
        )
        if a_result_album.is_not_ok():
            logger.error(f"Error getting album from provider. {a_result_album.info()}")
            return Result(code=a_result_album.code(), message=a_result_album.message())

        album: BaseAlbumWithSongsResponse = a_result_album.result()[0]
        unliked_count: int = 0

        for song in album.songs:
            a_result_song_media: Result[
                CoreMediaRow
            ] = await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=song.publicId,
                media_type_keys=[MediaTypeEnum.SONG],
            )
            if a_result_song_media.is_not_ok():
                logger.warning(f"Could not find media for song {song.publicId}. Skipping.")
                continue

            song_media: CoreMediaRow = a_result_song_media.result()

            a_result_unlike: Result[bool] = await UserLikedMediaAccess.remove_like_async(
                session=session, user_id=user_id, media_id=song_media.id
            )
            if a_result_unlike.is_ok():
                unliked_count += 1

        return Result(code=ResultCode.OK, message="OK", result=unliked_count)

    @staticmethod
    async def like_media_async(
        session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> Result[list[UserLikedMediaRow]]:
        """Like multiple songs by public_ids."""

        liked_media: list[UserLikedMediaRow] = []

        for media_public_id in public_ids:
            a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
                session=session, public_id=media_public_id, media_type_keys=None
            )
            if a_result_media.is_not_ok():
                logger.warning(f"Could not find media {media_public_id}. Skipping.")
                continue

            media: CoreMediaRow = a_result_media.result()

            a_result: Result[UserLikedMediaRow] = await UserLikedMediaAccess.add_like_async(
                session=session, user_id=user_id, media_id=media.id
            )
            if a_result.is_ok():
                liked_media.append(a_result.result())

        return Result(code=ResultCode.OK, message="OK", result=liked_media)

    @staticmethod
    async def unlike_songs(
        session: AsyncSession, user_id: int, song_public_ids: list[str]
    ) -> Result[int]:
        """Unlike multiple songs by public_ids."""

        unliked_count: int = 0

        for song_public_id in song_public_ids:
            a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
                session=session,
                public_id=song_public_id,
                media_type_keys=[MediaTypeEnum.SONG],
            )
            if a_result_media.is_not_ok():
                logger.warning(f"Could not find media for song {song_public_id}. Skipping.")
                continue

            media: CoreMediaRow = a_result_media.result()

            a_result: Result[bool] = await UserLikedMediaAccess.remove_like_async(
                session=session, user_id=user_id, media_id=media.id
            )
            if a_result.is_ok():
                unliked_count += 1

        return Result(code=ResultCode.OK, message="OK", result=unliked_count)

    @staticmethod
    async def get_user_liked_media_public_ids(
        session: AsyncSession, user_id: int
    ) -> Result[list[str]]:
        """Get all liked song public IDs for a user."""

        a_result: Result[
            list[str]
        ] = await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting liked songs. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def update_user_current_media(
        session: AsyncSession,
        user_id: int,
        queue_id: int,
        media_public_id: str,
    ) -> Result[bool]:
        """Update user's current queue media after validating the public ID matches."""

        a_result_queue_item: Result[
            UserQueueRow
        ] = await UserQueueAccess.get_queue_item_by_queue_id(
            session=session,
            user_id=user_id,
            queue_id=queue_id,
        )
        if a_result_queue_item.is_not_ok():
            logger.error(f"Error getting queue item. {a_result_queue_item.info()}")
            return Result(code=a_result_queue_item.code(), message=a_result_queue_item.message())

        queue_item: UserQueueRow = a_result_queue_item.result()

        if queue_item.media.public_id != media_public_id:
            logger.error(
                f"Media public ID mismatch. Expected "
                f"{queue_item.media.public_id}, got {media_public_id}"
            )
            return Result(code=ResultCode.VALIDATION_ERROR, message="Media public ID mismatch")

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        return await UserAccess.update_user_current_queue_id_async(
            session=session, user_id=user_id, queue_id=queue_id
        )

    @staticmethod
    async def update_user_current_time(
        session: AsyncSession, user_id: int, current_time_ms: int, media_public_id: str
    ) -> Result[bool]:
        """Update user's current playback time."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        return await UserAccess.update_user_current_time_async(
            session=session, user_id=user_id, current_time_ms=current_time_ms
        )

    @staticmethod
    async def add_user_current_time_seek_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_from: float,
        time_to: float,
    ) -> ResultCode:
        a_result: Result[UserSeeksRow] = await UserAccess.add_user_current_time_seek_async(
            session=session,
            user_id=user_id,
            media_id=media_id,
            time_from=time_from,
            time_to=time_to,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding user current time seek. {a_result.info()}")
            return ResultCode(code=a_result.code(), message=a_result.message())

        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    async def save_user_queue_async(
        session: AsyncSession,
        user_id: int,
        queue_items: list[QueueItem],
    ) -> ResultCode:
        # The queue is replaced below. If the stored current queue id does not
        # exist in the new queue, the reference is stale (queue ids are reused
        # across plays), which would make a later restart resume the wrong song.
        # The reset is performed atomically with the save.
        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return ResultCode(code=a_result_user.code(), message=a_result_user.message())

        current_queue_id: int | None = a_result_user.result().current_queue_id
        valid_queue_ids: list[int] = [item.queue_id for item in queue_items]
        reset_current_queue_id: bool = (
            current_queue_id is not None and current_queue_id not in valid_queue_ids
        )

        a_result: Result[bool] = await UserQueueAccess.save_user_queue_async(
            session=session,
            user_id=user_id,
            queue_items=queue_items,
            reset_current_queue_id=reset_current_queue_id,
            expected_current_queue_id=(current_queue_id if reset_current_queue_id else None),
        )

        if a_result.is_not_ok():
            logger.error(f"Error saving user queue. {a_result.info()}")
            return ResultCode(code=a_result.code(), message=a_result.message())

        if reset_current_queue_id:
            logger.warning(
                f"Queue replaced without current queue id {current_queue_id}; "
                f"resetting current queue id."
            )

        return ResultCode(code=ResultCode.OK, message="OK")

    @staticmethod
    async def update_lang_async(
        session: AsyncSession, user_id: int, lang_code: str
    ) -> Result[bool]:
        """Update the user's language by language code."""

        a_result_lang: Result[LanguageRow] = await LanguageAccess.get_language_from_code(
            session=session, lang_code=lang_code
        )
        if a_result_lang.is_not_ok():
            logger.error(f"Error getting language. {a_result_lang.info()}")
            return Result(code=ResultCode.BAD_REQUEST, message="Invalid language code")

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        return await UserAccess.update_user_lang_async(
            session=session, user_id=user_id, lang_id=a_result_lang.result().id
        )

    @staticmethod
    async def update_crossfade_async(
        session: AsyncSession, user_id: int, crossfade_ms: int
    ) -> Result[bool]:
        """Update the user's crossfade setting."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        return await UserAccess.update_user_crossfade_async(
            session=session, user_id=user_id, crossfade_ms=crossfade_ms
        )

    @staticmethod
    async def update_password_async(
        session: AsyncSession, user_id: int, password_hash: str
    ) -> Result[bool]:
        """Update the user's password hash."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        return await UserAccess.update_user_password_async(
            session=session, user_id=user_id, password_hash=password_hash
        )

    @staticmethod
    async def update_queue_type_async(
        session: AsyncSession, user_id: int, queue_type: QueueTypeEnum
    ) -> Result[bool]:
        """Set the user's queue type directly."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        return await UserAccess.update_user_queue_type_async(
            session=session, user_id=user_id, queue_type_key=queue_type.value
        )

    @staticmethod
    async def toggle_random_queue_async(session: AsyncSession, user_id: int) -> Result[bool]:
        """Toggle the user's random queue mode."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        new_queue_type_key = 2 if a_result_user.result().queue_type_key == 1 else 1
        return await UserAccess.update_user_queue_type_async(
            session=session, user_id=user_id, queue_type_key=new_queue_type_key
        )

    @staticmethod
    async def cycle_repeat_mode_async(session: AsyncSession, user_id: int) -> Result[bool]:
        """Cycle the user's repeat mode."""

        a_result_user: Result[UserRow] = await UserAccess.get_user_from_id(
            session=session, user_id=user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"Error getting user. {a_result_user.info()}")
            return Result(code=a_result_user.code(), message=a_result_user.message())

        current_mode: int = a_result_user.result().repeat_mode_key
        new_repeat_mode_key = 1 if current_mode >= 3 else current_mode + 1
        return await UserAccess.update_user_repeat_mode_async(
            session=session, user_id=user_id, repeat_mode_key=new_repeat_mode_key
        )

    @staticmethod
    async def add_user_media_clicked_async(
        session: AsyncSession, user_id: int, media_public_id: str
    ) -> Result[bool]:
        """Record that a user clicked on a media item."""

        a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())

        a_result: Result[UserMediaClickedRow] = await UserAccess.add_user_media_clicked_async(
            session=session,
            user_id=user_id,
            media_id=a_result_media.result().id,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding media click. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_user_skipped_media_async(
        session: AsyncSession,
        user_id: int,
        media_public_id: str,
        direction: SkipDirectionEnum,
    ) -> Result[bool]:
        """Record that a user skipped a media item."""

        a_result_media: Result[CoreMediaRow] = await MediaAccess.get_media_from_public_id_async(
            session=session,
            public_id=media_public_id,
            media_type_keys=None,
        )
        if a_result_media.is_not_ok():
            logger.error(f"Error getting media. {a_result_media.info()}")
            return Result(code=a_result_media.code(), message=a_result_media.message())

        a_result: Result[UserSkippedMediaRow] = await UserAccess.add_user_skipped_media_async(
            session=session,
            user_id=user_id,
            media_id=a_result_media.result().id,
            skip_direction_key=direction.value,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding media skip. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def add_user_media_listened_async(
        session: AsyncSession, user_id: int, media_id: int
    ) -> Result[bool]:
        """Record that a user has listened to a media item (>=90% of song)."""

        a_result: Result[UserMediaListenedRow] = await UserAccess.add_user_media_listened_async(
            session=session,
            user_id=user_id,
            media_id=media_id,
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding media listened. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        from core.framework.friend.listeningBadges import ListeningBadges

        rewards = await ListeningBadges.refresh_user_async(
            session=session, user_id=user_id
        )
        if rewards.is_not_ok():
            logger.error("Error awarding listen emblems: %s", rewards.info())
            return Result(code=rewards.code(), message=rewards.message())
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def record_media_listen_interval_async(
        session: AsyncSession,
        user_id: int,
        media_id: int,
        time_ms_start: int,
        time_ms_end: int,
    ) -> Result[UserMediaListenIntervalRow]:
        """Insert a new listen interval and return the created row."""

        a_result: Result[
            UserMediaListenIntervalRow
        ] = await UserAccess.add_user_media_listen_interval_async(
            session=session,
            user_id=user_id,
            media_id=media_id,
            time_ms_start=time_ms_start,
            time_ms_end=time_ms_end,
        )
        if a_result.is_not_ok():
            logger.error(f"Error recording listen interval. {a_result.info()}")
            return Result(code=a_result.code(), message=a_result.message())

        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def update_media_listen_interval_end_async(
        session: AsyncSession,
        interval_id: int,
        time_ms_end: int,
    ) -> ResultCode:
        """Update the end time of an existing open listen interval."""

        a_result: ResultCode = await UserAccess.update_user_media_listen_interval_end_async(
            session=session,
            interval_id=interval_id,
            time_ms_end=time_ms_end,
        )
        if a_result.is_not_ok():
            logger.error(f"Error updating listen interval end. {a_result.info()}")
            return ResultCode(code=a_result.code(), message=a_result.message())

        return ResultCode(code=ResultCode.OK, message="OK")
