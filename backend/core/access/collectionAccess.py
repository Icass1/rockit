from typing import Any

from sqlalchemy import select, union_all, literal, func, exists, insert, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.constants import BACKEND_URL
from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.framework.models.collection import CollectionRecord, CollectionEntry
from backend.core.utils.safeAsyncCall import safe_async

logger = getLogger(__name__)
SCHEMAS = {
    "default_schema",
    "spotify",
    "spotify_scrapper",
    "youtube_music",
    "youtube",
    "rockit",
    "radio_browser",
}


class CollectionAccess:
    @staticmethod
    def _visible(user_id: int) -> Any:
        """SQL predicate shared by browsing, traversal, search, and queue creation."""
        playlists = shared_metadata.tables["default_schema.playlist"]
        contributors = shared_metadata.tables["default_schema.playlist_contributor"]
        return ~exists(
            select(playlists.c.id).where(
                playlists.c.id == shared_metadata.tables["core.media"].c.id,
                playlists.c.is_public.is_(False),
                playlists.c.owner_id != user_id,
                ~exists(
                    select(contributors.c.playlist_id).where(
                        contributors.c.playlist_id == playlists.c.id,
                        contributors.c.user_id == user_id,
                    )
                ).correlate(playlists),
            )
        ).correlate(shared_metadata.tables["core.media"])

    @staticmethod
    def _names() -> Any:
        """Build a provider-independent name index without loading ORM relationships."""
        statements: list[Select[Any]] = []
        for table in shared_metadata.tables.values():
            if (
                table.schema in SCHEMAS
                and table.name
                in {"playlist", "album", "song", "track", "video", "station"}
                and "id" in table.c
            ):
                name = table.c.get("name")
                if name is None:
                    name = table.c.get("title")
                if name is not None:
                    statements.append(
                        select(table.c.id.label("id"), name.label("name"))
                    )
        return union_all(*statements).subquery("collection_names")

    @staticmethod
    def _edges(user_id: int) -> Any:
        """Normalize all provider membership tables to a stable ordered edge list."""
        statements: list[Select[Any]] = []
        for table in shared_metadata.tables.values():
            if table.schema not in SCHEMAS:
                continue
            if table.name in {"playlist_media", "playlist_track", "playlist_video"}:
                child = next(
                    table.c[c]
                    for c in ("media_id", "song_id", "video_id")
                    if c in table.c
                )
                position = table.c.get("position")
                if position is None:
                    # Imported Spotify/YouTube membership has no source ordinal.
                    position = child
                added = table.c.get("added_at")
                if added is None:
                    added = table.c.date_added
                stmt = select(
                    table.c.playlist_id.label("parent_id"),
                    child.label("media_id"),
                    position.label("position"),
                    added.label("added_at"),
                )
                if "disabled" in table.c:
                    stmt = stmt.where(table.c.disabled.is_(False))
                if table.name == "playlist_media":
                    disabled = shared_metadata.tables[
                        "default_schema.user_disabled_playlist_media"
                    ]
                    stmt = stmt.where(
                        ~exists(
                            select(disabled.c.playlist_media_id).where(
                                disabled.c.user_id == user_id,
                                disabled.c.playlist_media_id == table.c.id,
                            )
                        )
                    )
                statements.append(stmt)
            elif table.name in {"song", "track"} and "album_id" in table.c:
                disc = table.c.get("disc_number", literal(0))
                track = table.c.get("track_number", table.c.id)
                statements.append(
                    select(
                        table.c.album_id.label("parent_id"),
                        table.c.id.label("media_id"),
                        (disc * 1000000 + track).label("position"),
                        table.c.date_added.label("added_at"),
                    ).where(table.c.album_id.is_not(None))
                )
        return (
            union_all(*statements)
            .cte("collection_edges")
            .prefix_with("NOT MATERIALIZED", dialect="postgresql")
        )

    @staticmethod
    @safe_async
    async def records_async(
        session: AsyncSession, public_ids: list[str], user_id: int
    ) -> AResult[list[CollectionRecord]]:
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
            return AResult(
                code=AResultCode.OK, message="OK", result=list(records.values())
            )
        image = shared_metadata.tables["core.image"]
        for table in shared_metadata.tables.values():
            if (
                table.schema not in SCHEMAS
                or table.name not in {"playlist", "album"}
                or not records
            ):
                continue
            stmt = (
                select(
                    table,
                    image.c.public_id.label("image_public_id"),
                    image.c.dominant_color.label("image_color"),
                )
                .outerjoin(image, image.c.id == table.c.image_id)
                .where(table.c.id.in_(collection_ids))
            )
            for row in (await session.execute(stmt)).mappings():
                records[row["id"]].data.update(dict(row), provider_schema=table.schema)
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
            r.data["owner_id"]
            for r in records.values()
            if r.data.get("owner_id") is not None
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
                    imageUrl=(
                        f"{BACKEND_URL}/media/image/{r['image_public_id']}"
                        if r["image_public_id"]
                        else ""
                    ),
                )
                for r in owner_rows
            }
            for record in records.values():
                record.data["owner_info"] = owner_map.get(record.data.get("owner_id"))
        for association in shared_metadata.tables.values():
            if association.schema not in SCHEMAS or association.name not in {
                "album_artist",
                "album_artists",
            }:
                continue
            artist = shared_metadata.tables[f"{association.schema}.artist"]
            artist_name = artist.c.get("name")
            if artist_name is None:
                artist_name = artist.c.title
            rows = (
                (
                    await session.execute(
                        select(
                            association.c.album_id,
                            media.c.public_id,
                            artist_name.label("name"),
                            image.c.public_id.label("image_public_id"),
                        )
                        .join(artist, artist.c.id == association.c.artist_id)
                        .join(media, media.c.id == artist.c.id)
                        .outerjoin(image, image.c.id == artist.c.image_id)
                        .where(association.c.album_id.in_(collection_ids))
                        .order_by(artist.c.id)
                    )
                )
                .mappings()
                .all()
            )
            for row in rows:
                records[row["album_id"]].data.setdefault("artists", []).append(
                    dict(
                        provider=association.schema,
                        publicId=row["public_id"],
                        name=row["name"],
                        dominantColor="",
                        url=f"/artist/{row['public_id']}",
                        providerUrl="",
                        imageUrl=(
                            f"{BACKEND_URL}/media/image/{row['image_public_id']}"
                            if row["image_public_id"]
                            else ""
                        ),
                    )
                )
        contributors = shared_metadata.tables["default_schema.playlist_contributor"]
        rows = (
            (
                await session.execute(
                    select(
                        contributors.c.playlist_id,
                        contributors.c.role_key,
                        users.c.public_id,
                        users.c.username,
                    )
                    .join(users, users.c.id == contributors.c.user_id)
                    .where(contributors.c.playlist_id.in_(collection_ids))
                )
            )
            .mappings()
            .all()
        )
        for row in rows:
            records[row["playlist_id"]].data.setdefault("contributors", []).append(
                dict(
                    userPublicId=row["public_id"],
                    username=row["username"],
                    role=PlaylistContributorRoleEnum(row["role_key"]),
                )
            )
        return AResult(code=AResultCode.OK, message="OK", result=list(records.values()))

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
    ) -> AResult[tuple[list[CollectionEntry], int]]:
        """Apply search, permissions, count, and pagination in SQL before hydration."""
        edges = CollectionAccess._edges(user_id=user_id)
        media = shared_metadata.tables["core.media"]
        if recursive or query.strip():
            reachable = select(literal(parent_id).label("id")).cte(
                "reachable", recursive=True
            )
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
            names = CollectionAccess._names()
            stmt = stmt.join(names, names.c.id == edges.c.media_id).where(
                names.c.name.icontains(query.strip(), autoescape=True)
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
            membership = shared_metadata.tables["default_schema.playlist_media"]
            expanded = shared_metadata.tables[
                "default_schema.user_playlist_media_expanded"
            ]
            values = (
                await session.execute(
                    select(
                        membership.c.playlist_id,
                        membership.c.position,
                        expanded.c.is_expanded,
                    )
                    .join(expanded, expanded.c.playlist_media_id == membership.c.id)
                    .where(
                        expanded.c.user_id == user_id,
                        membership.c.playlist_id.in_({e.parent_id for e in entries}),
                    )
                )
            ).all()
            expanded_map = {(pid, position): value for pid, position, value in values}
            for entry in entries:
                entry.expanded = expanded_map.get(
                    (entry.parent_id, entry.position), False
                )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=(entries, total),
        )

    @staticmethod
    @safe_async
    async def public_ids_async(
        session: AsyncSession, ids: list[int]
    ) -> AResult[dict[int, str]]:
        """Map internal identifiers in one query."""
        media = shared_metadata.tables["core.media"]
        rows = await session.execute(
            select(media.c.id, media.c.public_id).where(media.c.id.in_(ids))
        )
        return AResult(
            code=AResultCode.OK,
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
    ) -> AResult[int]:
        """Serialize replacement per user and commit queue and selection atomically."""
        users = shared_metadata.tables["core.user"]
        queue = shared_metadata.tables["core.user_queue"]
        queue_type = (
            await session.execute(
                select(users.c.queue_type_key)
                .where(users.c.id == user_id)
                .with_for_update()
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
        return AResult(code=AResultCode.OK, message="OK", result=queue_type)
