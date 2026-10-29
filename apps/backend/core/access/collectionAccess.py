from sqlalchemy import (
    Integer,
    String,
    and_,
    delete,
    exists,
    func,
    insert,
    literal,
    or_,
    select,
    text,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement
from sqlalchemy.sql.selectable import CTE, Subquery

from core.access.adminSearchAccess import AdminSearchAccess
from core.access.collectionCatalog import collection_catalog
from core.access.collectionSources import collection_sources
from core.access.db.shared_metadata import shared_metadata
from core.framework.models.collection import CollectionEntry, CollectionRecord
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class CollectionAccess:
    @staticmethod
    def _visible(user_id: int) -> ColumnElement[bool]:
        """SQL predicate shared by browsing, traversal, search, and queue creation."""
        return and_(*(source.visible(user_id) for source in collection_sources), literal(True))

    @staticmethod
    def _names() -> Subquery:
        """Consume registered metadata without knowing provider table layouts."""
        metadata = collection_catalog.metadata()
        return select(metadata.c.id, metadata.c.name).subquery("collection_names")

    @staticmethod
    def _edges(user_id: int) -> CTE:
        """Compose provider-owned membership projections for generic traversal."""
        edges = collection_catalog.edges(user_id=user_id)
        return (
            select(edges)
            .cte("collection_edges")
            .prefix_with("NOT MATERIALIZED", dialect="postgresql")
        )

    @staticmethod
    def search_sources(user_id: int) -> tuple[Subquery, CTE, ColumnElement[bool]]:
        """Expose the shared name index, filtered edges and visibility to Library search."""
        return (
            CollectionAccess._names(),
            CollectionAccess._edges(user_id=user_id),
            CollectionAccess._visible(user_id=user_id),
        )

    @staticmethod
    @safe_async
    async def records_async(
        session: AsyncSession, public_ids: list[str], user_id: int
    ) -> Result[list[CollectionRecord]]:
        """Fetch metadata and collection summaries in batches, without contents."""
        media = shared_metadata.tables["core.media"]
        names = CollectionAccess._names()
        rows = (
            (
                await session.execute(
                    select(media, names.c.name)
                    .join(names, names.c.id == media.c.id)
                    .where(
                        media.c.public_id.in_(public_ids),
                        CollectionAccess._visible(user_id=user_id),
                    )
                )
            )
            .mappings()
            .all()
        )
        records = {
            r["id"]: CollectionRecord(
                id=r["id"],
                public_id=r["public_id"],
                provider_id=r["provider_id"],
                media_type_key=r["media_type_key"],
                name=r["name"],
            )
            for r in rows
        }
        collection_ids = [r.id for r in records.values() if r.media_type_key in (2, 3)]
        if not collection_ids:
            return Result(code=ResultCode.OK, message="OK", result=list(records.values()))
        image = shared_metadata.tables["core.image"]
        details = collection_catalog.details()
        statement = (
            select(
                details,
                image.c.public_id.label("image_public_id"),
                image.c.dominant_color.label("image_color"),
            )
            .outerjoin(image, image.c.id == details.c.image_id)
            .where(details.c.id.in_(collection_ids))
        )
        for row in (await session.execute(statement)).mappings():
            records[row["id"]].data.update(dict(row))
        edges = CollectionAccess._edges(user_id=user_id)
        counts = (
            await session.execute(
                select(edges.c.parent_id, func.count().label("count"))
                .join(media, media.c.id == edges.c.media_id)
                .where(
                    edges.c.parent_id.in_(collection_ids),
                    CollectionAccess._visible(user_id=user_id),
                )
                .group_by(edges.c.parent_id)
            )
        ).all()
        for parent_id, count in counts:
            records[parent_id].data["item_count"] = count
        users = shared_metadata.tables["core.user"]
        owners = {
            r.data["owner_id"] for r in records.values() if r.data.get("owner_id") is not None
        }
        if owners:
            owner_rows = (
                (
                    await session.execute(
                        select(
                            users.c.id,
                            users.c.public_id,
                            users.c.username,
                            image.c.public_id.label("image_public_id"),
                        )
                        .outerjoin(image, image.c.id == users.c.image_id)
                        .where(users.c.id.in_(owners))
                    )
                )
                .mappings()
                .all()
            )
            owner_map = {
                r["id"]: dict(
                    provider="Core",
                    publicId=r["public_id"],
                    name=r["username"],
                    dominantColor=r.get("image_color") or "",
                    url=f"/user/{r['public_id']}",
                    providerUrl="",
                    image_public_id=r["image_public_id"],
                )
                for r in owner_rows
            }
            for record in records.values():
                record.data["owner_info"] = owner_map.get(record.data.get("owner_id"))
        artists = collection_catalog.artists()
        artist_rows = (
            (
                await session.execute(
                    select(
                        artists.c.parent_id,
                        artists.c.name,
                        artists.c.provider,
                        media.c.public_id,
                        image.c.public_id.label("image_public_id"),
                    )
                    .join(media, media.c.id == artists.c.artist_id)
                    .outerjoin(image, image.c.id == artists.c.image_id)
                    .where(artists.c.parent_id.in_(collection_ids))
                    .order_by(artists.c.artist_id)
                )
            )
            .mappings()
            .all()
        )
        for row in artist_rows:
            records[row["parent_id"]].data.setdefault("artists", []).append(
                dict(
                    provider=row["provider"],
                    publicId=row["public_id"],
                    name=row["name"],
                    dominantColor="",
                    url=f"/artist/{row['public_id']}",
                    providerUrl="",
                    image_public_id=row["image_public_id"],
                )
            )
        for source in collection_sources:
            enriched = await source.enrich_async(session, records, collection_ids)
            if enriched.is_not_ok():
                logger.error(f"Error loading collection details: {enriched.info()}")
                return Result(code=enriched.code(), message=enriched.message())
        return Result(code=ResultCode.OK, message="OK", result=list(records.values()))

    @staticmethod
    @safe_async
    async def entries_async(
        session: AsyncSession,
        parent_id: int,
        user_id: int,
        offset: int = 0,
        limit: int = 100,
        query: str = "",
        recursive: bool = False,
    ) -> Result[tuple[list[CollectionEntry], int]]:
        """Apply search, permissions, count, and pagination in SQL before hydration."""
        edges = CollectionAccess._edges(user_id=user_id)
        media = shared_metadata.tables["core.media"]
        if recursive or query.strip():
            reachable = select(literal(parent_id).label("id")).cte("reachable", recursive=True)
            reachable = reachable.union(
                select(edges.c.media_id)
                .join(reachable, reachable.c.id == edges.c.parent_id)
                .join(media, media.c.id == edges.c.media_id)
                .where(CollectionAccess._visible(user_id=user_id))
            )
            parents = select(reachable.c.id)
        else:
            parents = select(literal(parent_id))
        stmt = (
            select(edges)
            .join(media, media.c.id == edges.c.media_id)
            .where(
                edges.c.parent_id.in_(parents),
                CollectionAccess._visible(user_id=user_id),
            )
        )
        if query.strip():
            fragment = AdminSearchAccess.get_search_index_fragment()
            if not fragment:
                return Result(code=ResultCode.OK, message="OK", result=([], 0))
            index = (
                text(fragment)
                .columns(
                    internal_id=Integer,
                    public_id=String,
                    name=String,
                    subtitle=String,
                    media_type_key=Integer,
                    provider_name=String,
                    image_url=String,
                )
                .subquery("collection_search")
            )
            stmt = stmt.where(
                exists(
                    select(index.c.internal_id).where(
                        index.c.internal_id == edges.c.media_id,
                        index.c.media_type_key == media.c.media_type_key,
                        or_(
                            index.c.name.icontains(query.strip(), autoescape=True),
                            index.c.subtitle.icontains(query.strip(), autoescape=True),
                            index.c.public_id.icontains(query.strip(), autoescape=True),
                        ),
                    )
                ).correlate(edges, media)
            )
        total = (
            await session.execute(select(func.count()).select_from(stmt.subquery()))
        ).scalar_one()
        if not recursive:
            stmt = (
                stmt.order_by(edges.c.parent_id, edges.c.position, edges.c.media_id)
                .offset(offset)
                .limit(limit)
            )
        rows = (await session.execute(stmt)).mappings().all()
        entries = [CollectionEntry(**dict(r)) for r in rows]
        if entries and not recursive:
            expanded_map: dict[tuple[int, int], bool] = {}
            for source in collection_sources:
                result = await source.expanded_async(session, entries, user_id)
                if result.is_not_ok():
                    logger.error(f"Error loading expanded collection items: {result.info()}")
                    return Result(code=result.code(), message=result.message())
                expanded_map.update(result.result())
            for entry in entries:
                entry.expanded = expanded_map.get((entry.parent_id, entry.position), False)
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=(entries, total),
        )

    @staticmethod
    @safe_async
    async def public_ids_async(session: AsyncSession, ids: list[int]) -> Result[dict[int, str]]:
        """Map internal identifiers in one query."""
        media = shared_metadata.tables["core.media"]
        rows = await session.execute(
            select(media.c.id, media.c.public_id).where(media.c.id.in_(ids))
        )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result={row[0]: row[1] for row in rows.all()},
        )

    @staticmethod
    @safe_async
    async def save_queue_async(
        session: AsyncSession,
        user_id: int,
        root_id: int,
        ordered_ids: list[int],
        random_indexes: dict[int, int],
        start: int,
    ) -> Result[int]:
        """Serialize replacement per user and commit queue and selection atomically."""
        users = shared_metadata.tables["core.user"]
        queue = shared_metadata.tables["core.user_queue"]
        queue_type = (
            await session.execute(
                select(users.c.queue_type_key).where(users.c.id == user_id).with_for_update()
            )
        ).scalar_one()
        await session.execute(delete(queue).where(queue.c.user_id == user_id))
        values = [
            dict(
                user_id=user_id,
                media_id=media_id,
                list_media_id=root_id,
                queue_id=i,
                sorted_index=i,
                random_index=random_indexes[i],
            )
            for i, media_id in enumerate(ordered_ids)
        ]
        for offset in range(0, len(values), 500):
            await session.execute(insert(queue), values[offset : offset + 500])
        await session.execute(
            update(users)
            .where(users.c.id == user_id)
            .values(current_queue_id=start, current_time_ms=0)
        )
        await session.commit()
        return Result(code=ResultCode.OK, message="OK", result=queue_type)
