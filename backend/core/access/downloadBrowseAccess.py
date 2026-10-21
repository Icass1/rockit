from typing import Any
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func, literal, union_all, exists, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.db.ormModels.download import DownloadRow
from backend.core.access.db.ormModels.downloadGroup import DownloadGroupRow
from backend.core.access.db.ormModels.downloadStatus import DownloadStatusRow
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.provider import ProviderRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow


class DownloadBrowseAccess:
    @staticmethod
    def metadata(with_images: bool = True) -> Any:
        """A local, narrow provider index; never fetch container children or remote APIs."""
        statements: list[Select[Any]] = []
        for table in shared_metadata.tables.values():
            if table.schema == "core" or table.name not in {
                "playlist",
                "album",
                "song",
                "track",
                "video",
            }:
                continue
            name = table.c.get("name")
            if name is None:
                name = table.c.get("title")
            if name is None or "id" not in table.c:
                continue
            image = table.c.get("image_id")
            source = table
            if with_images and image is None and "album_id" in table.c:
                album = shared_metadata.tables.get(f"{table.schema}.album")
                if album is not None:
                    source = table.outerjoin(album, album.c.id == table.c.album_id)
                    image = album.c.get("image_id")
            external = table.c.get("spotify_id")
            if external is None:
                external = table.c.get("youtube_id")
            statements.append(
                select(
                    table.c.id.label("id"),
                    name.label("name"),
                    (image if image is not None else literal(None)).label("image_id"),
                    (external if external is not None else literal(None)).label(
                        "external_id"
                    ),
                ).select_from(source)
            )
        return union_all(*statements).subquery("download_metadata")

    @staticmethod
    def status_predicate(status: str) -> Any:
        if status == "completed":
            return DownloadRow.status_key == 3
        if status == "failed":
            return DownloadRow.status_key == 4
        if status == "active":
            return DownloadRow.status_key.not_in([3, 4])
        return literal(True)

    @staticmethod
    def search_predicate(query: str) -> Any:
        """Match whole named collections, or just the matching songs inside a group."""
        if not query:
            return literal(True)
        pattern = (
            "%"
            + query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            + "%"
        )
        metadata = DownloadBrowseAccess.metadata(with_images=False)
        matches = (
            select(metadata.c.id)
            .where(metadata.c.name.ilike(pattern, escape="\\"))
            .cte("download_search_matches")
            .prefix_with("MATERIALIZED", dialect="postgresql")
        )
        matched_ids = select(matches.c.id)
        collection_ids = (
            select(DownloadGroupRow.id)
            .outerjoin(
                CoreMediaRow,
                CoreMediaRow.public_id == DownloadGroupRow.source_public_id,
            )
            .where(
                or_(
                    DownloadGroupRow.title.ilike(pattern, escape="\\"),
                    CoreMediaRow.id.in_(matched_ids),
                )
            )
            .correlate(None)
        )
        return or_(
            DownloadRow.download_group_id.in_(collection_ids),
            DownloadRow.media_id.in_(matched_ids),
        )

    @staticmethod
    @safe_async
    async def totals_async(
        session: AsyncSession, user_id: int
    ) -> AResult[dict[str, Any]]:
        """Compute counters across the entire history, independent of loaded pages."""
        row = (
            (
                await session.execute(
                    select(
                        func.count().label("total"),
                        func.count()
                        .filter(DownloadRow.status_key == 3)
                        .label("completed"),
                        func.count()
                        .filter(DownloadRow.status_key == 4)
                        .label("failed"),
                        func.count()
                        .filter(DownloadRow.status_key.not_in([3, 4]))
                        .label("active"),
                    )
                    .select_from(DownloadRow)
                    .join(DownloadGroupRow)
                    .where(
                        DownloadGroupRow.user_id == user_id,
                        DownloadGroupRow.seen.is_(False),
                        DownloadRow.seen.is_(False),
                    )
                )
            )
            .mappings()
            .one()
        )
        today = datetime.now(timezone.utc).date()
        first = today - timedelta(days=13)
        daily_rows = await session.execute(
            select(func.date(DownloadRow.date_ended), func.count())
            .join(DownloadGroupRow)
            .where(
                DownloadGroupRow.user_id == user_id,
                DownloadGroupRow.seen.is_(False),
                DownloadRow.seen.is_(False),
                DownloadRow.status_key == 3,
                DownloadRow.date_ended
                >= datetime.combine(first, datetime.min.time(), tzinfo=timezone.utc),
            )
            .group_by(func.date(DownloadRow.date_ended))
        )
        daily = {date: count for date, count in daily_rows}
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                **dict(row),
                "daily": [
                    daily.get(first + timedelta(days=offset), 0) for offset in range(14)
                ],
            },
        )

    @staticmethod
    @safe_async
    async def groups_async(
        session: AsyncSession,
        user_id: int,
        page: int,
        status: str,
        kind: str,
        query: str,
    ) -> AResult[list[dict[str, Any]]]:
        """Fetch twelve group headers plus one sentinel; no item histories are loaded."""
        meta = DownloadBrowseAccess.metadata()
        counts = (
            select(
                DownloadRow.download_group_id.label("group_id"),
                func.count().label("total"),
                func.count().filter(DownloadRow.status_key == 3).label("completed"),
                func.count().filter(DownloadRow.status_key == 4).label("failed"),
                func.count()
                .filter(DownloadRow.status_key.not_in([3, 4]))
                .label("active"),
                func.count()
                .filter(
                    DownloadBrowseAccess.status_predicate(status=status),
                    DownloadBrowseAccess.search_predicate(query=query),
                )
                .label("matching"),
                func.bool_and(
                    DownloadRow.media_id.in_(
                        select(CoreMediaRow.id)
                        .join(ProviderRow, ProviderRow.id == CoreMediaRow.provider_id)
                        .where(
                            ProviderRow.name.in_(
                                [
                                    "Spotify",
                                    "SpotifyScrapper",
                                    "YouTube",
                                    "YouTube Music",
                                ]
                            )
                        )
                    )
                ).label("manageable"),
            )
            .join(DownloadGroupRow)
            .where(DownloadGroupRow.user_id == user_id, DownloadRow.seen.is_(False))
            .group_by(DownloadRow.download_group_id)
            .subquery()
        )
        stmt = (
            select(
                DownloadGroupRow.id,
                DownloadGroupRow.public_id,
                DownloadGroupRow.title,
                DownloadGroupRow.date_started,
                DownloadGroupRow.date_ended,
                DownloadGroupRow.source_public_id,
                counts.c.total,
                counts.c.completed,
                counts.c.failed,
                counts.c.active,
                counts.c.matching,
                counts.c.manageable,
                meta.c.name,
                meta.c.external_id,
                CoreMediaRow.media_type_key,
                CoreMediaRow.provider_id,
                ImageRow.public_id.label("image_public_id"),
                ProviderRow.name.label("provider"),
                exists(
                    select(UserLibraryMediaRow.id).where(
                        UserLibraryMediaRow.user_id == user_id,
                        UserLibraryMediaRow.media_id == CoreMediaRow.id,
                    )
                ).label("in_library"),
            )
            .select_from(DownloadGroupRow)
            .join(counts, counts.c.group_id == DownloadGroupRow.id)
            .outerjoin(
                CoreMediaRow,
                CoreMediaRow.public_id == DownloadGroupRow.source_public_id,
            )
            .outerjoin(meta, meta.c.id == CoreMediaRow.id)
            .outerjoin(ImageRow, ImageRow.id == meta.c.image_id)
            .outerjoin(ProviderRow, ProviderRow.id == CoreMediaRow.provider_id)
            .where(
                DownloadGroupRow.user_id == user_id,
                DownloadGroupRow.seen.is_(False),
                counts.c.matching > 0,
            )
        )
        if kind in {"album", "playlist"}:
            stmt = stmt.where(
                CoreMediaRow.media_type_key == (2 if kind == "album" else 3)
            )
        rows = (
            (
                await session.execute(
                    stmt.order_by(
                        DownloadGroupRow.date_started.desc(), DownloadGroupRow.id.desc()
                    )
                    .offset(page * 12)
                    .limit(13)
                )
            )
            .mappings()
            .all()
        )
        return AResult(
            code=AResultCode.OK, message="OK", result=[dict(row) for row in rows]
        )

    @staticmethod
    @safe_async
    async def items_async(
        session: AsyncSession,
        group_ids: list[int],
        status: str,
        offset: int = 0,
        limit: int = 48,
        query: str = "",
    ) -> AResult[list[dict[str, Any]]]:
        """Window each requested group before joining metadata; read only its latest progress."""
        ranked = (
            select(
                DownloadRow,
                func.row_number()
                .over(
                    partition_by=DownloadRow.download_group_id, order_by=DownloadRow.id
                )
                .label("ordinal"),
            )
            .where(
                DownloadRow.download_group_id.in_(group_ids),
                DownloadRow.seen.is_(False),
                DownloadBrowseAccess.status_predicate(status=status),
                DownloadBrowseAccess.search_predicate(query=query),
            )
            .subquery()
        )
        meta = DownloadBrowseAccess.metadata()
        latest = (
            select(DownloadStatusRow.completed)
            .where(
                DownloadStatusRow.download_id == ranked.c.id,
                ranked.c.status_key.not_in([1, 3, 4]),
            )
            .order_by(DownloadStatusRow.id.desc())
            .limit(1)
            .scalar_subquery()
        )
        stmt = (
            select(
                ranked,
                CoreMediaRow.public_id.label("media_public_id"),
                CoreMediaRow.media_type_key,
                meta.c.name,
                ImageRow.public_id.label("image_public_id"),
                ProviderRow.name.label("provider"),
                latest.label("progress"),
            )
            .select_from(ranked)
            .join(CoreMediaRow, CoreMediaRow.id == ranked.c.media_id)
            .outerjoin(meta, meta.c.id == CoreMediaRow.id)
            .outerjoin(ImageRow, ImageRow.id == meta.c.image_id)
            .outerjoin(ProviderRow, ProviderRow.id == CoreMediaRow.provider_id)
            .where(ranked.c.ordinal > offset, ranked.c.ordinal <= offset + limit)
            .order_by(ranked.c.download_group_id, ranked.c.ordinal)
        )
        rows = (await session.execute(stmt)).mappings().all()
        return AResult(
            code=AResultCode.OK, message="OK", result=[dict(row) for row in rows]
        )

    @staticmethod
    @safe_async
    async def group_rows_async(
        session: AsyncSession, group_id: int
    ) -> AResult[list[tuple[DownloadRow, CoreMediaRow]]]:
        """Fetch the complete action target set once, with rows locked against concurrent actions."""
        rows = (
            await session.execute(
                select(DownloadRow, CoreMediaRow)
                .join(CoreMediaRow, CoreMediaRow.id == DownloadRow.media_id)
                .where(
                    DownloadRow.download_group_id == group_id,
                    DownloadRow.seen.is_(False),
                )
                .order_by(DownloadRow.id)
                .with_for_update(of=DownloadRow)
            )
        ).all()
        return AResult(
            code=AResultCode.OK, message="OK", result=[(row[0], row[1]) for row in rows]
        )

    @staticmethod
    @safe_async
    async def clear_files_async(
        session: AsyncSession, media_ids: list[int]
    ) -> AResult[list[str]]:
        """Clear paths in provider batches, returning files for the framework to archive."""
        paths: list[str] = []
        for key, column in [
            ("spotify.track", "path"),
            ("spotify_scrapper.track", "path"),
            ("youtube_music.track", "path"),
            ("youtube.video", "video_path"),
        ]:
            table = shared_metadata.tables.get(key)
            if table is None:
                continue
            old = await session.execute(
                select(table.c[column]).where(table.c.id.in_(media_ids))
            )
            paths.extend(value for value in old.scalars() if value)
            await session.execute(
                update(table).where(table.c.id.in_(media_ids)).values({column: None})
            )
        return AResult(code=AResultCode.OK, message="OK", result=paths)

    @staticmethod
    @safe_async
    async def reset_group_async(
        session: AsyncSession, group: DownloadGroupRow, download_ids: list[int]
    ) -> AResult[bool]:
        """Reset terminal children together, retaining their source grouping."""
        await session.execute(
            update(DownloadRow)
            .where(DownloadRow.id.in_(download_ids))
            .values(status_key=1, retry_count=0, date_ended=None)
        )
        group.status_key = 1
        group.date_ended = None
        group.success = 0
        group.fail = 0
        group.seen = False
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def item_count_async(
        session: AsyncSession, group_id: int, status: str, query: str = ""
    ) -> AResult[int]:
        """Count the matching tracks without materializing any of them."""
        value = await session.scalar(
            select(func.count())
            .select_from(DownloadRow)
            .where(
                DownloadRow.download_group_id == group_id,
                DownloadRow.seen.is_(False),
                DownloadBrowseAccess.status_predicate(status=status),
                DownloadBrowseAccess.search_predicate(query=query),
            )
        )
        return AResult(code=AResultCode.OK, message="OK", result=value or 0)

    @staticmethod
    @safe_async
    async def has_other_active_async(
        session: AsyncSession, group_id: int, media_ids: list[int]
    ) -> AResult[bool]:
        """Do not change a file while another group is still downloading it."""
        value = await session.scalar(
            select(
                exists(
                    select(DownloadRow.id).where(
                        DownloadRow.media_id.in_(media_ids),
                        DownloadRow.download_group_id != group_id,
                        DownloadRow.status_key.not_in([3, 4]),
                    )
                )
            )
        )
        return AResult(code=AResultCode.OK, message="OK", result=bool(value))
