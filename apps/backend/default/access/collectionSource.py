"""Permissions and per-user playlist metadata owned by the playlist provider."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import Table, exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement, Select

from core.access.collectionSources import collection_sources
from core.access.db.shared_metadata import shared_metadata
from core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode

if TYPE_CHECKING:
    from core.framework.models.collection import (
        CollectionEntry,
        CollectionRecord,
    )


class DefaultCollectionSource:
    @staticmethod
    def visible(user_id: int) -> ColumnElement[bool]:
        media = shared_metadata.tables["core.media"]
        playlists = shared_metadata.tables["default_schema.playlist"]
        contributors = shared_metadata.tables["default_schema.playlist_contributor"]
        return ~exists(
            select(playlists.c.id).where(
                playlists.c.id == media.c.id,
                playlists.c.is_public.is_(False),
                playlists.c.owner_id != user_id,
                ~exists(
                    select(contributors.c.playlist_id).where(
                        contributors.c.playlist_id == playlists.c.id,
                        contributors.c.user_id == user_id,
                    )
                ).correlate(playlists),
            )
        ).correlate(media)

    @staticmethod
    def filter_edges(statement: Select[Any], table: Table, user_id: int) -> Select[Any]:
        if table is shared_metadata.tables["default_schema.playlist_media"]:
            disabled = shared_metadata.tables["default_schema.user_disabled_playlist_media"]
            statement = statement.where(
                ~exists(
                    select(disabled.c.playlist_media_id).where(
                        disabled.c.user_id == user_id,
                        disabled.c.playlist_media_id == table.c.id,
                    )
                )
            )
        return statement

    @staticmethod
    @safe_async
    async def enrich_async(
        session: AsyncSession,
        records: dict[int, CollectionRecord],
        collection_ids: list[int],
    ) -> Result[bool]:
        users = shared_metadata.tables["core.user"]
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
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def expanded_async(
        session: AsyncSession, entries: list[CollectionEntry], user_id: int
    ) -> Result[dict[tuple[int, int], bool]]:
        membership = shared_metadata.tables["default_schema.playlist_media"]
        expanded = shared_metadata.tables["default_schema.user_playlist_media_expanded"]
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
        return Result(code=ResultCode.OK, message="OK", result=expanded_map)


collection_sources.append(DefaultCollectionSource())
