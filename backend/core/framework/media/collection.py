from collections import defaultdict
from random import shuffle
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.constants import BACKEND_URL
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.collectionAccess import CollectionAccess
from backend.core.framework import providers
from backend.core.framework.models.collection import CollectionRecord, CollectionEntry
from backend.core.responses.baseArtistResponse import BaseArtistResponse
from backend.core.responses.baseAlbumWithSongsResponse import BaseAlbumWithSongsResponse
from backend.core.responses.basePlaylistWithMediasResponse import (
    BasePlaylistWithMediasResponse,
)
from backend.core.responses.basePlaylistForPlaylistResponse import (
    BasePlaylistForPlaylistResponse,
)
from backend.core.responses.collectionPageResponse import CollectionPageResponse
from backend.core.responses.queueResponse import QueueResponse, QueueResponseItem
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.core.types.playlistMediaTypes import PlaylistResponseItem

logger = getLogger(__name__)


class Collection:
    @staticmethod
    def summary(
        record: CollectionRecord,
    ) -> BaseAlbumWithSongsResponse | BasePlaylistWithMediasResponse:
        """Build collection metadata with explicitly unloaded child contents."""
        provider = providers.find_media_provider(provider_id=record.provider_id)
        data = record.data
        kind = "album" if record.media_type_key == 2 else "playlist"
        provider_url = data.get("provider_url", "")
        if data.get("spotify_id"):
            provider_url = f"https://open.spotify.com/{kind}/{data['spotify_id']}"
        elif data.get("youtube_id"):
            provider_url = (
                f"https://music.youtube.com/browse/{data['youtube_id']}"
                if kind == "album"
                else f"https://www.youtube.com/playlist?list={data['youtube_id']}"
            )
        common: dict[str, Any] = dict(
            provider=provider.get_name() if provider else "",
            publicId=record.public_id,
            url=f"/{'album' if record.media_type_key == 2 else 'playlist'}/{record.public_id}",
            providerUrl=provider_url,
            name=record.name,
            imageUrl=(
                f"{BACKEND_URL}/media/image/{data['image_public_id']}"
                if data.get("image_public_id")
                else ""
            ),
        )
        if record.media_type_key == 2:
            return BaseAlbumWithSongsResponse(
                **common,
                artists=[
                    BaseArtistResponse(**{**a, "provider": common["provider"]})
                    for a in data.get("artists", [])
                ],
                releaseDate=str(data.get("release_date", "")),
                dominantColor=data.get("image_color") or "",
                songs=[],
                total=data.get("item_count", 0),
                hasMore=data.get("item_count", 0) > 0,
            )
        owner: dict[str, Any] = data.get("owner_info") or dict(
            provider=common["provider"],
            publicId="",
            url="",
            providerUrl="",
            name=str(data.get("owner", "")),
            dominantColor="",
            imageUrl="",
        )
        return BasePlaylistWithMediasResponse(
            **common,
            owner=BaseArtistResponse(**owner),
            description=data.get("description"),
            contributors=data.get("contributors", []),
            medias=[],
            total=data.get("item_count", 0),
            hasMore=data.get("item_count", 0) > 0,
        )

    @staticmethod
    async def hydrate_async(
        session: AsyncSession, records: list[CollectionRecord]
    ) -> AResult[dict[str, Any]]:
        """Hydrate playable media in provider batches; nested collections stay unloaded."""
        result: dict[str, Any] = {}
        groups: defaultdict[tuple[int, int], list[str]] = defaultdict(list)
        for record in records:
            if record.media_type_key in (2, 3):
                item = Collection.summary(record=record)
                if isinstance(item, BasePlaylistWithMediasResponse):
                    item = BasePlaylistForPlaylistResponse(
                        **item.model_dump(exclude={"owner"}),
                        owner=item.owner.name,
                        itemCount=record.data.get("item_count", 0),
                    )
                result[record.public_id] = item
            else:
                groups[(record.provider_id, record.media_type_key)].append(
                    record.public_id
                )
        methods = {4: "get_songs_async", 5: "get_videos_async", 6: "get_stations_async"}
        for (provider_id, media_type), ids in groups.items():
            provider = providers.find_media_provider(provider_id=provider_id)
            if provider is None or media_type not in methods:
                logger.error("Unsupported provider or media type in collection")
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Collection media provider unavailable",
                )
            for start in range(0, len(ids), 200):
                response = await getattr(provider, methods[media_type])(
                    session=session, public_ids=ids[start : start + 200]
                )
                if response.is_not_ok():
                    logger.error(f"Collection hydration failed: {response.info()}")
                    return AResult(code=response.code(), message=response.message())
                result.update({item.publicId: item for item in response.result()})
        return AResult(code=AResultCode.OK, message="OK", result=result)

    @staticmethod
    async def metadata_async(
        session: AsyncSession, public_id: str, user_id: int
    ) -> AResult[BaseAlbumWithSongsResponse | BasePlaylistWithMediasResponse]:
        """Get a collection's metadata without hydrating any descendants."""
        result = await CollectionAccess.records_async(
            session=session, public_ids=[public_id], user_id=user_id
        )
        if result.is_not_ok():
            logger.error(f"Collection metadata lookup failed: {result.info()}")
            return AResult(code=result.code(), message=result.message())
        records = result.result()
        if not records or records[0].media_type_key not in (2, 3):
            logger.warning("Collection metadata not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Collection not found")
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=Collection.summary(record=records[0]),
        )

    @staticmethod
    async def page_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
        offset: int = 0,
        limit: int = 100,
        query: str = "",
    ) -> AResult[CollectionPageResponse]:
        """Browse or search a collection while loading only the requested page."""
        root_result = await CollectionAccess.records_async(
            session=session, public_ids=[public_id], user_id=user_id
        )
        if root_result.is_not_ok():
            logger.error(f"Collection lookup failed: {root_result.info()}")
            return AResult(code=root_result.code(), message=root_result.message())
        roots = root_result.result()
        if not roots or roots[0].media_type_key not in (2, 3):
            logger.warning("Collection not found or inaccessible")
            return AResult(code=AResultCode.NOT_FOUND, message="Collection not found")
        root = roots[0]
        entries_result = await CollectionAccess.entries_async(
            session=session,
            parent_id=root.id,
            user_id=user_id,
            offset=offset,
            limit=limit,
            query=query,
        )
        if entries_result.is_not_ok():
            logger.error(f"Collection page failed: {entries_result.info()}")
            return AResult(code=entries_result.code(), message=entries_result.message())
        entries, total = entries_result.result()
        ids_result = await CollectionAccess.public_ids_async(
            session=session, ids=list({e.media_id for e in entries})
        )
        if ids_result.is_not_ok():
            logger.error(f"Collection identifiers failed: {ids_result.info()}")
            return AResult(code=ids_result.code(), message=ids_result.message())
        ids = ids_result.result()
        records_result = await CollectionAccess.records_async(
            session=session, public_ids=list(ids.values()), user_id=user_id
        )
        if records_result.is_not_ok():
            logger.error(f"Collection metadata failed: {records_result.info()}")
            return AResult(code=records_result.code(), message=records_result.message())
        hydrated = await Collection.hydrate_async(
            session=session, records=records_result.result()
        )
        if hydrated.is_not_ok():
            logger.error(f"Collection items failed: {hydrated.info()}")
            return AResult(code=hydrated.code(), message=hydrated.message())
        items = hydrated.result()
        if any(ids.get(entry.media_id) not in items for entry in entries):
            logger.error("Provider omitted a collection page item")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Collection media unavailable"
            )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=CollectionPageResponse(
                collection=Collection.summary(record=root),
                items=[
                    PlaylistResponseItem(
                        item=items[ids[e.media_id]],
                        addedAt=e.added_at,
                        expanded=e.expanded,
                    )
                    for e in entries
                    if ids.get(e.media_id) in items
                ],
                offset=offset,
                limit=limit,
                total=total,
                hasMore=offset + limit < total,
            ),
        )

    @staticmethod
    async def queue_async(
        session: AsyncSession,
        public_id: str,
        user_id: int,
        start_public_id: str | None = None,
        persist: bool = True,
    ) -> AResult[QueueResponse]:
        """Resolve the complete ordered graph and persist a queue, independent of UI pages."""
        root_result = await CollectionAccess.records_async(
            session=session, public_ids=[public_id], user_id=user_id
        )
        if root_result.is_not_ok():
            logger.error(f"Queue collection lookup failed: {root_result.info()}")
            return AResult(code=root_result.code(), message=root_result.message())
        roots = root_result.result()
        if not roots or roots[0].media_type_key not in (2, 3):
            logger.warning("Queue collection not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Collection not found")
        root = roots[0]
        graph_result = await CollectionAccess.entries_async(
            session=session, parent_id=root.id, user_id=user_id, recursive=True
        )
        if graph_result.is_not_ok():
            logger.error(f"Queue traversal failed: {graph_result.info()}")
            return AResult(code=graph_result.code(), message=graph_result.message())
        entries, _ = graph_result.result()
        children: defaultdict[int, list[CollectionEntry]] = defaultdict(list)
        for entry in entries:
            children[entry.parent_id].append(entry)
        for values in children.values():
            values.sort(key=lambda e: (e.position, e.media_id))
        ids_result = await CollectionAccess.public_ids_async(
            session=session, ids=list({e.media_id for e in entries})
        )
        if ids_result.is_not_ok():
            logger.error(f"Queue identifiers failed: {ids_result.info()}")
            return AResult(code=ids_result.code(), message=ids_result.message())
        ids = ids_result.result()
        records_result = await CollectionAccess.records_async(
            session=session, public_ids=list(ids.values()), user_id=user_id
        )
        if records_result.is_not_ok():
            logger.error(f"Queue metadata failed: {records_result.info()}")
            return AResult(code=records_result.code(), message=records_result.message())
        records = {r.id: r for r in records_result.result()}
        ordered: list[int] = []
        # Iterative DFS preserves repeated occurrences and avoids recursion limits.
        stack: list[tuple[int, frozenset[int]]] = [(root.id, frozenset())]
        while stack:
            media_id, ancestors = stack.pop()
            if media_id in ancestors:
                continue
            record = records.get(media_id, root if media_id == root.id else None)
            if record is None:
                continue
            if record.media_type_key in (4, 5):
                ordered.append(media_id)
            elif record.media_type_key in (2, 3):
                stack.extend(
                    (e.media_id, ancestors | {media_id})
                    for e in reversed(children[media_id])
                )
        if not ordered:
            logger.warning("Collection contains no queueable media")
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Collection contains no queueable media",
            )
        start = (
            next(
                (
                    i
                    for i, media_id in enumerate(ordered)
                    if ids[media_id] == start_public_id
                ),
                None,
            )
            if start_public_id
            else 0
        )
        if start is None:
            logger.warning("Requested queue start is outside collection")
            return AResult(
                code=AResultCode.BAD_REQUEST,
                message="Start media is not in the collection",
            )
        random_order = list(range(len(ordered)))
        shuffle(random_order)
        random_order.remove(start)
        random_order.insert(0, start)
        random_indexes = {value: i for i, value in enumerate(random_order)}
        hydrated = await Collection.hydrate_async(
            session=session,
            records=[r for r in records.values() if r.media_type_key in (4, 5)],
        )
        if hydrated.is_not_ok():
            logger.error(f"Queue hydration failed: {hydrated.info()}")
            return AResult(code=hydrated.code(), message=hydrated.message())
        medias = hydrated.result()
        if any(ids[media_id] not in medias for media_id in ordered):
            logger.error("Provider omitted a queue item")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Queue media unavailable"
            )
        if not persist:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=QueueResponse(
                    currentQueueMediaId=start,
                    queueType=QueueTypeEnum.SORTED,
                    queue=[
                        QueueResponseItem(
                            queueMediaId=i,
                            listPublicId=public_id,
                            media=medias[ids[media_id]],
                            sortedIndex=i,
                            randomIndex=random_indexes[i],
                        )
                        for i, media_id in enumerate(ordered)
                    ],
                ),
            )
        saved = await CollectionAccess.save_queue_async(
            session=session,
            user_id=user_id,
            root_id=root.id,
            ordered_ids=ordered,
            random_indexes=random_indexes,
            start=start,
        )
        if saved.is_not_ok():
            logger.error(f"Queue save failed: {saved.info()}")
            return AResult(code=saved.code(), message=saved.message())
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=QueueResponse(
                currentQueueMediaId=start,
                queueType=QueueTypeEnum(saved.result()),
                queue=[
                    QueueResponseItem(
                        queueMediaId=i,
                        listPublicId=public_id,
                        media=medias[ids[media_id]],
                        sortedIndex=i,
                        randomIndex=random_indexes[i],
                    )
                    for i, media_id in enumerate(ordered)
                ],
            ),
        )
