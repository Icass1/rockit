from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.mediaInfoCte import get_media_info_cte, get_genre_info_cte
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.utils.logger import getLogger

logger = getLogger(__name__)

# How many of the user's top genres to draw mood candidates from.
MOOD_TOP_GENRE_COUNT = 3


# Co-occurrence signal weights. Both signals are raw counts on different
# natural scales (playlist appearances are few; session co-plays can be
# many for an active user), so these are a starting point to retune once
# there's real usage data to look at, not a derived/calibrated value.
PLAYLIST_CO_WEIGHT = 1.0
SESSION_CO_WEIGHT = 1.0

# Two listens by the same user within this many minutes of each other count
# as the same "session" for the co-occurrence signal.
SESSION_WINDOW_MINUTES = 20


class RecommendationAccess:
    @staticmethod
    async def get_similar_song_ids_async(
        session: AsyncSession,
        seed_media_ids: list[int],
        exclude_media_ids: list[int],
        limit: int = 20,
    ) -> AResult[list[str]]:
        """Rank songs by co-occurrence with the given seed songs.

        Combines two implicit-feedback signals derived entirely from Rockit's
        own usage data (no external API, no per-song genre/audio-feature data
        needed):
          - playlist co-occurrence: songs sharing a playlist with a seed song
          - session co-occurrence: songs a user played within
            SESSION_WINDOW_MINUTES of a seed song
        """

        if not seed_media_ids:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            sql = text(f"""
            WITH {get_media_info_cte()},
            playlist_co AS (
                SELECT pm2.media_id                          AS media_id,
                       COUNT(DISTINCT pm1.playlist_id)        AS playlist_score
                FROM   default_schema.playlist_media pm1
                JOIN   default_schema.playlist_media pm2
                       ON pm2.playlist_id = pm1.playlist_id
                      AND pm2.media_id   != pm1.media_id
                WHERE  pm1.media_id IN :seed_ids
                GROUP BY pm2.media_id
            ),
            session_co AS (
                SELECT b.media_id   AS media_id,
                       COUNT(*)     AS session_score
                FROM   core.user_media_listened a
                JOIN   core.user_media_listened b
                       ON b.user_id   = a.user_id
                      AND b.media_id != a.media_id
                      AND b.date_added BETWEEN a.date_added - INTERVAL '{SESSION_WINDOW_MINUTES} minutes'
                                            AND a.date_added + INTERVAL '{SESSION_WINDOW_MINUTES} minutes'
                WHERE  a.media_id IN :seed_ids
                GROUP BY b.media_id
            ),
            combined AS (
                SELECT COALESCE(p.media_id, s.media_id)                AS media_id,
                       COALESCE(p.playlist_score, 0) * :playlist_weight
                     + COALESCE(s.session_score, 0)  * :session_weight AS score
                FROM      playlist_co p
                FULL JOIN session_co  s ON s.media_id = p.media_id
            )
            SELECT mi.public_id
            FROM   combined  c
            JOIN   media_info mi ON mi.media_id = c.media_id
            WHERE  mi.media_type_key = {MediaTypeEnum.SONG.value}
              AND  c.media_id NOT IN :exclude_ids
            ORDER BY c.score DESC, mi.public_id
            LIMIT :limit
            """).bindparams(
                bindparam("seed_ids", expanding=True),
                bindparam("exclude_ids", expanding=True),
            )

            rows = (
                await session.execute(
                    sql,
                    {
                        "seed_ids": seed_media_ids,
                        "exclude_ids": exclude_media_ids,
                        "playlist_weight": PLAYLIST_CO_WEIGHT,
                        "session_weight": SESSION_CO_WEIGHT,
                        "limit": limit,
                    },
                )
            ).fetchall()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=[str(r.public_id) for r in rows],
            )
        except Exception as e:
            logger.error(f"Error in get_similar_song_ids_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to compute similar songs: {e}",
            )

    @staticmethod
    async def get_community_top_song_ids_async(
        session: AsyncSession,
        exclude_media_ids: list[int],
        limit: int = 15,
    ) -> AResult[list[str]]:
        """Top songs by total play count across all users."""

        try:
            sql = text(f"""
            WITH {get_media_info_cte()},
            play_counts AS (
                SELECT uml.media_id, COUNT(*) AS play_count
                FROM   core.user_media_listened uml
                JOIN   media_info mi ON mi.media_id = uml.media_id
                WHERE  mi.media_type_key = {MediaTypeEnum.SONG.value}
                GROUP BY uml.media_id
            )
            SELECT mi.public_id
            FROM   play_counts pc
            JOIN   media_info  mi ON mi.media_id = pc.media_id
            WHERE  pc.media_id NOT IN :exclude_ids
            ORDER BY pc.play_count DESC, mi.public_id
            LIMIT :limit
            """).bindparams(bindparam("exclude_ids", expanding=True))

            rows = (
                await session.execute(
                    sql,
                    {"exclude_ids": exclude_media_ids, "limit": limit},
                )
            ).fetchall()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=[str(r.public_id) for r in rows],
            )
        except Exception as e:
            logger.error(
                f"Error in get_community_top_song_ids_async: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to compute community top songs: {e}",
            )

    @staticmethod
    async def get_mood_song_ids_async(
        session: AsyncSession,
        user_id: int,
        exclude_media_ids: list[int],
        limit: int = 12,
    ) -> AResult[list[str]]:
        """Random songs from the user's top genres (by recent listens).

        Only providers that contribute genre data (currently Spotify, via
        artist genres) participate — returns empty if none apply to this
        user's listening history.
        """

        try:
            sql = text(f"""
            WITH {get_media_info_cte()},
            {get_genre_info_cte()},
            user_genre_counts AS (
                SELECT gi.genre_name, COUNT(*) AS play_count
                FROM   core.user_media_listened uml
                JOIN   genre_info gi ON gi.media_id = uml.media_id
                WHERE  uml.user_id = :user_id
                GROUP BY gi.genre_name
                ORDER BY play_count DESC
                LIMIT {MOOD_TOP_GENRE_COUNT}
            ),
            candidates AS (
                SELECT DISTINCT gi.media_id
                FROM   genre_info gi
                JOIN   user_genre_counts ugc ON ugc.genre_name = gi.genre_name
            )
            SELECT mi.public_id
            FROM   candidates c
            JOIN   media_info mi ON mi.media_id = c.media_id
            WHERE  mi.media_type_key = {MediaTypeEnum.SONG.value}
              AND  c.media_id NOT IN :exclude_ids
            ORDER BY random()
            LIMIT :limit
            """).bindparams(bindparam("exclude_ids", expanding=True))

            rows = (
                await session.execute(
                    sql,
                    {
                        "user_id": user_id,
                        "exclude_ids": exclude_media_ids,
                        "limit": limit,
                    },
                )
            ).fetchall()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=[str(r.public_id) for r in rows],
            )
        except Exception as e:
            logger.error(f"Error in get_mood_song_ids_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to compute mood songs: {e}",
            )
