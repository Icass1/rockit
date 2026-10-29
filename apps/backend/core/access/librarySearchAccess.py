import unicodedata

from sqlalchemy import Integer, String, and_, case, exists, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import ColumnElement

from core.access.adminSearchAccess import AdminSearchAccess
from core.access.collectionAccess import CollectionAccess
from core.access.db.shared_metadata import shared_metadata
from core.enums.mediaTypeEnum import MediaTypeEnum
from core.framework.models.collection import CollectionRecord
from core.models.librarySongSearch import LibrarySongSort
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode

_ACCENTS = "áàâäãåéèêëíìîïóòôöõúùûüçñýÿ’‘‐‑–—"
_PLAIN = "aaaaaaeeeeiiiiooooouuuucnyy''----"


def _search_text(value: ColumnElement[str]) -> ColumnElement[str]:
    """Fold common Latin accents and punctuation without requiring a DB extension."""
    return func.translate(func.lower(func.normalize(func.coalesce(value, ""))), _ACCENTS, _PLAIN)


class LibrarySearchAccess:
    @staticmethod
    @safe_async
    async def songs_async(
        session: AsyncSession,
        user_id: int,
        query: str,
        offset: int,
        limit: int,
        sort: LibrarySongSort = "relevance",
    ) -> Result[tuple[list[CollectionRecord], int]]:
        """Search only reachable songs, deduplicate before pagination, and tolerate cycles."""
        normalized = " ".join(
            unicodedata.normalize("NFC", query)
            .lower()
            .translate(str.maketrans(_ACCENTS, _PLAIN))
            .split()
        )
        if not normalized:
            return Result(code=ResultCode.OK, message="OK", result=([], 0))
        media = shared_metadata.tables["core.media"]
        library = shared_metadata.tables["core.user_library_media"]
        names, edges, visible = CollectionAccess.search_sources(user_id=user_id)
        # UNION (not UNION ALL) is the visited set: duplicate paths and cycles cannot
        # multiply songs or make traversal unbounded. Check visibility at every hop.
        reachable = (
            select(media.c.id)
            .join(library, library.c.media_id == media.c.id)
            .where(library.c.user_id == user_id, visible)
            .cte("library_reachable", recursive=True)
        )
        reachable = reachable.union(
            select(media.c.id)
            .join(edges, edges.c.media_id == media.c.id)
            .join(reachable, reachable.c.id == edges.c.parent_id)
            .where(visible)
        )
        title = _search_text(names.c.name)
        tokens = normalized.split()
        matches = and_(*(title.contains(token, autoescape=True) for token in tokens))
        fragment = AdminSearchAccess.get_search_index_fragment()
        if fragment:
            index = (
                text(fragment)
                .columns(
                    internal_id=Integer,
                    public_id=String,
                    name=String,
                    subtitle=String,
                    media_type_key=Integer,
                    provider_name=String,
                    image_id=Integer,
                )
                .subquery("library_song_index")
            )
            context = _search_text(func.concat_ws(" ", index.c.name, index.c.subtitle))
            matches = or_(
                matches,
                exists(
                    select(index.c.internal_id).where(
                        index.c.internal_id == media.c.id,
                        index.c.media_type_key == MediaTypeEnum.SONG.value,
                        *(context.contains(token, autoescape=True) for token in tokens),
                    )
                ).correlate(media),
            )
        candidates = (
            select(media, names.c.name)
            .join(reachable, reachable.c.id == media.c.id)
            .join(names, names.c.id == media.c.id)
            .where(media.c.media_type_key == MediaTypeEnum.SONG.value, matches)
        )
        total = (
            await session.execute(select(func.count()).select_from(candidates.subquery()))
        ).scalar_one()
        if sort == "name_desc":
            order = [title.desc()]
        elif sort == "recent":
            order = [media.c.date_added.desc()]
        elif sort == "name_asc":
            order = [title.asc()]
        else:
            order = [
                case(
                    (title == normalized, 0),
                    (title.startswith(normalized, autoescape=True), 1),
                    else_=2,
                ),
                title.asc(),
            ]
        rows = (
            (
                await session.execute(
                    candidates.order_by(*order, media.c.public_id).offset(offset).limit(limit)
                )
            )
            .mappings()
            .all()
        )
        records = [
            CollectionRecord(
                id=row["id"],
                public_id=row["public_id"],
                provider_id=row["provider_id"],
                media_type_key=row["media_type_key"],
                name=row["name"],
            )
            for row in rows
        ]
        return Result(code=ResultCode.OK, message="OK", result=(records, total))
