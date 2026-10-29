from typing import Any

from sqlalchemy import Integer, delete, literal, select, union_all
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from sqlalchemy.sql.selectable import Subquery

from core.access.collectionAccess import CollectionAccess
from core.access.db.ormModels.user_navigation_list_pin import UserNavigationListPinRow
from core.access.db.ormModels.user_navigation_pin import UserNavigationPinRow
from core.access.db.shared_metadata import shared_metadata
from core.models.navigationPin import NavigationPinRecord
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class NavigationPinAccess:
    @staticmethod
    def _metadata() -> Subquery:
        """Summaries only: no provider imports, collection contents or external calls."""
        sources: list[Select[Any]] = []
        for table in shared_metadata.tables.values():
            if table.schema == "core" or table.name not in {
                "album",
                "playlist",
                "artist",
                "channel",
            }:
                continue
            name = table.c.get("name")
            if name is None:
                name = table.c.get("title")
            if name is None or "id" not in table.c:
                continue
            image = table.c.get("image_id")
            sources.append(
                select(
                    table.c.id.label("id"),
                    name.label("name"),
                    (image if image is not None else literal(None, type_=Integer)).label(
                        "image_id"
                    ),
                )
            )
        return union_all(*sources).subquery("navigation_metadata")

    @staticmethod
    @safe_async
    async def list_async(session: AsyncSession, user_id: int) -> Result[list[NavigationPinRecord]]:
        """Load visible pins and fresh summary metadata in one SQL query."""
        media = shared_metadata.tables["core.media"]
        pin = UserNavigationPinRow.__table__
        metadata = NavigationPinAccess._metadata()
        _, _, visible = CollectionAccess.search_sources(user_id=user_id)
        rows = (
            (
                await session.execute(
                    select(
                        media.c.public_id,
                        media.c.media_type_key,
                        metadata.c.name,
                        metadata.c.image_id,
                    )
                    .join(pin, pin.c.media_id == media.c.id)
                    .join(metadata, metadata.c.id == media.c.id)
                    .where(pin.c.user_id == user_id, media.c.media_type_key.in_((1, 2, 3)), visible)
                    .order_by(pin.c.date_added, media.c.public_id)
                )
            )
            .mappings()
            .all()
        )
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=[NavigationPinRecord(**dict(row)) for row in rows],
        )

    @staticmethod
    @safe_async
    async def add_async(session: AsyncSession, user_id: int, public_id: str) -> Result[bool]:
        """Idempotent insert from a visible, supported media row; preserve existing order."""
        media = shared_metadata.tables["core.media"]
        _, _, visible = CollectionAccess.search_sources(user_id=user_id)
        target = select(literal(user_id), media.c.id).where(
            media.c.public_id == public_id, media.c.media_type_key.in_((1, 2, 3)), visible
        )
        await session.execute(
            insert(UserNavigationPinRow)
            .from_select(["user_id", "media_id"], target)
            .on_conflict_do_nothing(index_elements=["user_id", "media_id"])
        )
        found = (
            await session.execute(
                select(media.c.id).where(
                    media.c.public_id == public_id, media.c.media_type_key.in_((1, 2, 3)), visible
                )
            )
        ).scalar_one_or_none()
        if found is None:
            logger.warning("Navigation pin target not found or inaccessible")
            return Result(code=ResultCode.NOT_FOUND, message="Pinnable media not found")
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def remove_async(session: AsyncSession, user_id: int, public_id: str) -> Result[bool]:
        """Remove only this user's reference, even if access to the target was revoked."""
        media = shared_metadata.tables["core.media"]
        await session.execute(
            delete(UserNavigationPinRow).where(
                UserNavigationPinRow.user_id == user_id,
                UserNavigationPinRow.media_id.in_(
                    select(media.c.id).where(media.c.public_id == public_id)
                ),
            )
        )
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def list_builtin_async(session: AsyncSession, user_id: int) -> Result[list[str]]:
        """Read only: loading shortcuts must never reseed removed defaults."""
        rows = await session.execute(
            select(UserNavigationListPinRow.list_key)
            .where(UserNavigationListPinRow.user_id == user_id)
            .order_by(UserNavigationListPinRow.date_added, UserNavigationListPinRow.list_key)
        )
        return Result(code=ResultCode.OK, message="OK", result=list(rows.scalars().all()))

    @staticmethod
    @safe_async
    async def add_builtins_async(
        session: AsyncSession, user_id: int, keys: list[str]
    ) -> Result[bool]:
        """Insert already validated shortcut keys in a single idempotent batch."""
        if keys:
            await session.execute(
                insert(UserNavigationListPinRow)
                .values([dict(user_id=user_id, list_key=key) for key in dict.fromkeys(keys)])
                .on_conflict_do_nothing(index_elements=["user_id", "list_key"])
            )
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def remove_builtin_async(session: AsyncSession, user_id: int, key: str) -> Result[bool]:
        """Remove only this user's reference, not the dynamic list itself."""
        await session.execute(
            delete(UserNavigationListPinRow).where(
                UserNavigationListPinRow.user_id == user_id,
                UserNavigationListPinRow.list_key == key,
            )
        )
        return Result(code=ResultCode.OK, message="OK", result=True)
