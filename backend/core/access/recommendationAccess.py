from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.shared_metadata import shared_metadata
from backend.core.access.statsAccess import get_media_info_cte, get_artist_info_cte
from backend.core.framework.models.recommendation import RecommendationCandidate
from backend.core.utils.safeAsyncCall import safe_async


class RecommendationAccess:
    @staticmethod
    @safe_async
    async def candidates_async(
        session: AsyncSession, user_id: int, limit: int = 2000
    ) -> AResult[list[RecommendationCandidate]]:
        """Read stored metadata and this user's signals, with no provider API calls."""
        fragments: list[str] = []
        for table in shared_metadata.tables.values():
            if table.schema == "core" or table.name not in {"song", "track"}:
                continue
            path = "file_path" if "file_path" in table.c else "path"
            if path not in table.c:
                continue
            # Identifiers come exclusively from registered SQLAlchemy metadata.
            album = shared_metadata.tables.get(f"{table.schema}.album")
            album_sql, album_expression = "", "''::text"
            if album is not None and "album_id" in table.c:
                album_name = "title" if "title" in album.c else "name"
                album_expression = f"a.{album_name}"
                album_sql = f"LEFT JOIN {album.fullname} a ON a.id = t.album_id"
            fragments.append(
                f"SELECT t.id, NULLIF(t.{path}, '') IS NOT NULL AS playable, "
                f"{album_expression} AS album FROM {table.fullname} t {album_sql}"
            )
        if not fragments:
            return AResult(code=AResultCode.OK, message="OK", result=[])
        files = " UNION ALL ".join(fragments)
        query = text(f"""
            WITH {get_media_info_cte()}, {get_artist_info_cte()},
            files AS ({files}),
            listens AS (
                SELECT media_id, count(*) AS plays, max(date_added) AS last_played
                FROM core.user_media_listened
                WHERE user_id = :user_id AND date_added >= now() - interval '90 days'
                GROUP BY media_id
            ), artists AS (
                SELECT media_id, array_agg(DISTINCT artist_name ORDER BY artist_name) AS names
                FROM artist_info GROUP BY media_id
            )
            SELECT mi.public_id, mi.media_name, f.album, f.playable,
                   COALESCE(a.names, ARRAY[]::text[]) AS artists,
                   COALESCE(l.plays, 0) AS plays, l.last_played,
                   liked.media_id IS NOT NULL AS liked,
                   library.media_id IS NOT NULL AS in_library,
                   EXISTS (SELECT 1 FROM core.user_queue q JOIN core.user u ON u.id = q.user_id
                           WHERE u.id = :user_id AND q.queue_id = u.current_queue_id
                             AND q.media_id = mi.media_id) AS current
            FROM media_info mi
            JOIN files f ON f.id = mi.media_id
            JOIN core.media cm ON cm.id = mi.media_id
            JOIN core.provider p ON p.id = cm.provider_id AND NOT p.disabled
            LEFT JOIN artists a ON a.media_id = mi.media_id
            LEFT JOIN listens l ON l.media_id = mi.media_id
            LEFT JOIN core.user_liked_media liked ON liked.media_id = mi.media_id AND liked.user_id = :user_id
            LEFT JOIN core.user_library_media library ON library.media_id = mi.media_id AND library.user_id = :user_id
            WHERE mi.media_type_key = 4
            ORDER BY (liked.media_id IS NOT NULL) DESC, COALESCE(l.plays, 0) DESC,
                     (library.media_id IS NOT NULL) DESC, cm.date_added DESC, mi.public_id
            LIMIT :limit
        """)
        rows = (
            await session.execute(query, {"user_id": user_id, "limit": limit})
        ).mappings()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                RecommendationCandidate(
                    public_id=r["public_id"],
                    name=r["media_name"] or "",
                    artists=tuple(r["artists"]),
                    album=r["album"] or "",
                    playable=r["playable"],
                    liked=r["liked"],
                    in_library=r["in_library"],
                    plays=int(r["plays"]),
                    last_played=r["last_played"],
                    current=r["current"],
                )
                for r in rows
            ],
        )

    @staticmethod
    @safe_async
    async def current_async(session: AsyncSession, user_id: int) -> AResult[str]:
        """Keep the current track exclusion fresh even while metadata is cached."""
        row = (
            await session.execute(
                text("""
            SELECT m.public_id FROM core.user u
            JOIN core.user_queue q ON q.user_id = u.id AND q.queue_id = u.current_queue_id
            JOIN core.media m ON m.id = q.media_id WHERE u.id = :user_id
        """),
                {"user_id": user_id},
            )
        ).scalar_one_or_none()
        return AResult(code=AResultCode.OK, message="OK", result=row or "")
