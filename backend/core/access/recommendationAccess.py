from sqlalchemy import Float, Integer, String, bindparam, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.mediaInfoCte import (
    get_album_info_cte,
    get_artist_info_cte,
    get_genre_info_cte,
    get_media_info_cte,
)
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.framework.models.recommendation import LocalCandidate
from backend.utils.logger import getLogger

logger = getLogger(__name__)

# How many of the user's top genres to draw mood candidates from.
MOOD_TOP_GENRE_COUNT = 3

# --- Discovery "already in library" matching --------------------------------
# pg_trgm similarity bars an external suggestion must clear before it is flagged
# as already available in this Rockit instance. Both must pass: the track name
# AND the contributing artist, so a same-titled different-track false positive
# (which would hide the suggestion and offer nothing playable) is very
# unlikely. Deliberately conservative — a miss only costs a redundant download
# attempt, a false positive is a dead card.
DISCOVER_LIBRARY_NAME_MATCH_THRESHOLD = 0.6
DISCOVER_LIBRARY_ARTIST_MATCH_THRESHOLD = 0.6


# Upper bound on candidate rows handed to the ranking layer per query. Keeps
# memory and ranking time flat regardless of library size. Weights live in
# backend.core.framework.recommendationRanking, not in SQL.
LOCAL_CANDIDATE_LIMIT = 300

# Two listens by the same user within this many minutes of each other count
# as the same "session" for the co-occurrence signal.
SESSION_WINDOW_MINUTES = 20


class RecommendationAccess:
    @staticmethod
    async def get_local_candidates_async(
        session: AsyncSession,
        seed_media_ids: list[int],
        exclude_media_ids: list[int],
        limit: int = LOCAL_CANDIDATE_LIMIT,
        user_id: int = 0,
    ) -> AResult[list[LocalCandidate]]:
        """Songs related to the seed songs, with the raw signals the ranking
        layer scores them by. Everything comes from Rockit's own data:
          - playlist co-occurrence: playlists shared with a seed song
          - session co-occurrence: plays within SESSION_WINDOW_MINUTES of a
            seed song, by the same user
          - metadata overlap: shared artists, same album, shared genres
            (genres only exist for providers that store them)
          - popularity: total plays on this instance

        A song only becomes a candidate when it has at least one relation to
        a seed. The pool is capped at `limit` rows (pre-sorted by a cheap sum
        of the signals) so ranking work stays bounded on large libraries.
        """

        if not seed_media_ids or limit <= 0:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            sql = text(f"""
            WITH {get_media_info_cte()},
            {get_artist_info_cte()},
            {get_album_info_cte()},
            {get_genre_info_cte()},
            seed AS (
                SELECT DISTINCT unnest(:seed_ids) AS media_id
            ),
            seed_artists AS (
                SELECT DISTINCT ai.artist_public_id
                FROM   artist_info ai
                JOIN   seed s ON s.media_id = ai.media_id
            ),
            seed_albums AS (
                SELECT DISTINCT al.album_public_id
                FROM   album_info al
                JOIN   seed s ON s.media_id = al.media_id
            ),
            seed_genres AS (
                SELECT DISTINCT gi.genre_name
                FROM   genre_info gi
                JOIN   seed s ON s.media_id = gi.media_id
            ),
            playlist_co AS (
                SELECT pm2.media_id                   AS media_id,
                       COUNT(DISTINCT pm1.playlist_id) AS playlist_co
                FROM   default_schema.playlist_media pm1
                JOIN   default_schema.playlist_media pm2
                       ON pm2.playlist_id = pm1.playlist_id
                      AND pm2.media_id   != pm1.media_id
                WHERE  pm1.media_id IN (SELECT media_id FROM seed)
                GROUP BY pm2.media_id
            ),
            session_co AS (
                SELECT b.media_id AS media_id,
                       COUNT(*)   AS session_co
                FROM   core.user_media_listened a
                JOIN   core.user_media_listened b
                       ON b.user_id   = a.user_id
                      AND b.media_id != a.media_id
                      AND b.date_added BETWEEN a.date_added - INTERVAL '{SESSION_WINDOW_MINUTES} minutes'
                                            AND a.date_added + INTERVAL '{SESSION_WINDOW_MINUTES} minutes'
                WHERE  a.media_id IN (SELECT media_id FROM seed)
                GROUP BY b.media_id
            ),
            artist_match AS (
                SELECT ai.media_id, COUNT(DISTINCT ai.artist_public_id) AS shared_artists
                FROM   artist_info ai
                JOIN   seed_artists sa ON sa.artist_public_id = ai.artist_public_id
                GROUP BY ai.media_id
            ),
            album_match AS (
                SELECT DISTINCT al.media_id
                FROM   album_info al
                JOIN   seed_albums sa ON sa.album_public_id = al.album_public_id
            ),
            genre_match AS (
                SELECT gi.media_id, COUNT(DISTINCT gi.genre_name) AS shared_genres
                FROM   genre_info gi
                JOIN   seed_genres sg ON sg.genre_name = gi.genre_name
                GROUP BY gi.media_id
            ),
            candidate_ids AS (
                SELECT media_id FROM playlist_co
                UNION SELECT media_id FROM session_co
                UNION SELECT media_id FROM artist_match
                UNION SELECT media_id FROM album_match
                UNION SELECT media_id FROM genre_match
            ),
            plays AS (
                SELECT uml.media_id, COUNT(*) AS play_count
                FROM   core.user_media_listened uml
                WHERE  uml.media_id IN (SELECT media_id FROM candidate_ids)
                GROUP BY uml.media_id
            ),
            user_plays AS (
                SELECT media_id, COUNT(*) AS recent_user_plays
                FROM core.user_media_listened
                WHERE user_id = :user_id AND date_added >= now() - INTERVAL '14 days'
                GROUP BY media_id
            ),
            primary_artist AS (
                SELECT ai.media_id, MIN(ai.artist_public_id) AS artist_key
                FROM   artist_info ai
                WHERE  ai.media_id IN (SELECT media_id FROM candidate_ids)
                GROUP BY ai.media_id
            ),
            primary_album AS (
                SELECT al.media_id, MIN(al.album_public_id) AS album_key
                FROM   album_info al
                WHERE  al.media_id IN (SELECT media_id FROM candidate_ids)
                GROUP BY al.media_id
            )
            SELECT c.media_id                         AS media_id,
                   mi.public_id                       AS public_id,
                   pa.artist_key                      AS artist_key,
                   pal.album_key                      AS album_key,
                   COALESCE(p.playlist_co, 0)         AS playlist_co,
                   COALESCE(s.session_co, 0)          AS session_co,
                   COALESCE(am.shared_artists, 0)     AS shared_artists,
                   (alm.media_id IS NOT NULL)         AS same_album,
                   COALESCE(gm.shared_genres, 0)      AS shared_genres,
                   COALESCE(pl.play_count, 0)         AS play_count,
                   COALESCE(up.recent_user_plays, 0) AS recent_user_plays
            FROM      candidate_ids  c
            JOIN      media_info     mi  ON mi.media_id  = c.media_id
            LEFT JOIN playlist_co    p   ON p.media_id   = c.media_id
            LEFT JOIN session_co     s   ON s.media_id   = c.media_id
            LEFT JOIN artist_match   am  ON am.media_id  = c.media_id
            LEFT JOIN album_match    alm ON alm.media_id = c.media_id
            LEFT JOIN genre_match    gm  ON gm.media_id  = c.media_id
            LEFT JOIN plays          pl  ON pl.media_id  = c.media_id
            LEFT JOIN user_plays up ON up.media_id = c.media_id
            LEFT JOIN primary_artist pa  ON pa.media_id  = c.media_id
            LEFT JOIN primary_album  pal ON pal.media_id = c.media_id
            WHERE  mi.media_type_key = :song_type_key
              AND  c.media_id NOT IN (SELECT media_id FROM seed)
              AND  c.media_id <> ALL(:exclude_ids)
            ORDER BY (COALESCE(p.playlist_co, 0) + COALESCE(s.session_co, 0)
                      + COALESCE(am.shared_artists, 0)
                      + COALESCE(gm.shared_genres, 0)) DESC,
                     mi.public_id
            LIMIT :limit
            """).bindparams(
                bindparam("seed_ids", type_=ARRAY(Integer)),
                bindparam("exclude_ids", type_=ARRAY(Integer)),
                bindparam("song_type_key", type_=Integer),
                bindparam("limit", type_=Integer),
            )

            rows = (
                await session.execute(
                    sql,
                    {
                        "seed_ids": seed_media_ids,
                        "user_id": user_id,
                        "exclude_ids": exclude_media_ids,
                        "song_type_key": MediaTypeEnum.SONG.value,
                        "limit": limit,
                    },
                )
            ).fetchall()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=[
                    LocalCandidate(
                        media_id=int(r.media_id),
                        public_id=str(r.public_id),
                        artist_key=str(r.artist_key) if r.artist_key else None,
                        album_key=str(r.album_key) if r.album_key else None,
                        playlist_co=int(r.playlist_co),
                        session_co=int(r.session_co),
                        shared_artists=int(r.shared_artists),
                        same_album=bool(r.same_album),
                        shared_genres=int(r.shared_genres),
                        play_count=int(r.play_count),
                        recent_user_plays=int(r.recent_user_plays),
                    )
                    for r in rows
                ],
            )
        except Exception as e:
            logger.error(f"Error in get_local_candidates_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to compute local candidates: {e}",
            )

    @staticmethod
    async def get_fallback_candidates_async(
        session: AsyncSession,
        exclude_media_ids: list[int],
        limit: int = LOCAL_CANDIDATE_LIMIT,
        rotation_key: str = "",
    ) -> AResult[list[LocalCandidate]]:
        """Cold-start candidates for users (or seeds) with little or no
        history: a stable rotating sample when rotation_key is supplied,
        otherwise the most played and newest songs. Ranking and diversity
        remain in the framework layer. Returns [] on an empty library."""

        if limit <= 0:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        try:
            sql = text(f"""
            WITH {get_media_info_cte()},
            {get_artist_info_cte()},
            {get_album_info_cte()},
            songs AS (
                SELECT DISTINCT mi.media_id, mi.public_id
                FROM   media_info mi
                WHERE  mi.media_type_key = :song_type_key
                  AND  mi.media_id <> ALL(:exclude_ids)
            ),
            plays AS (
                SELECT uml.media_id, COUNT(*) AS play_count
                FROM   core.user_media_listened uml
                WHERE  uml.media_id IN (SELECT media_id FROM songs)
                GROUP BY uml.media_id
            ),
            primary_artist AS (
                SELECT ai.media_id, MIN(ai.artist_public_id) AS artist_key
                FROM   artist_info ai
                WHERE  ai.media_id IN (SELECT media_id FROM songs)
                GROUP BY ai.media_id
            ),
            primary_album AS (
                SELECT al.media_id, MIN(al.album_public_id) AS album_key
                FROM   album_info al
                WHERE  al.media_id IN (SELECT media_id FROM songs)
                GROUP BY al.media_id
            )
            SELECT s.media_id                 AS media_id,
                   s.public_id                AS public_id,
                   pa.artist_key              AS artist_key,
                   pal.album_key              AS album_key,
                   COALESCE(pl.play_count, 0) AS play_count
            FROM      songs          s
            JOIN      core.media     cm  ON cm.id        = s.media_id
            LEFT JOIN plays          pl  ON pl.media_id  = s.media_id
            LEFT JOIN primary_artist pa  ON pa.media_id  = s.media_id
            LEFT JOIN primary_album  pal ON pal.media_id = s.media_id
            ORDER BY CASE WHEN :rotation_key = '' THEN COALESCE(pl.play_count, 0) ELSE 0 END DESC,
                     CASE WHEN :rotation_key <> '' THEN md5(s.public_id || :rotation_key) END,
                     cm.date_added DESC, s.public_id
            LIMIT :limit
            """).bindparams(
                bindparam("exclude_ids", type_=ARRAY(Integer)),
                bindparam("song_type_key", type_=Integer),
                bindparam("limit", type_=Integer),
            )

            rows = (
                await session.execute(
                    sql,
                    {
                        "exclude_ids": exclude_media_ids,
                        "rotation_key": rotation_key,
                        "song_type_key": MediaTypeEnum.SONG.value,
                        "limit": limit,
                    },
                )
            ).fetchall()

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=[
                    LocalCandidate(
                        media_id=int(r.media_id),
                        public_id=str(r.public_id),
                        artist_key=str(r.artist_key) if r.artist_key else None,
                        album_key=str(r.album_key) if r.album_key else None,
                        play_count=int(r.play_count),
                    )
                    for r in rows
                ],
            )
        except Exception as e:
            logger.error(f"Error in get_fallback_candidates_async: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to compute fallback candidates: {e}",
            )

    @staticmethod
    async def get_discover_song_candidates_async(
        session: AsyncSession,
        artists_and_tracks: list[tuple[str, str]],
    ) -> AResult[dict[int, list[str]]]:
        """Return up to three artist/title matches per suggestion in one batch.

        Availability is deliberately not decided here: each media provider
        owns its download/file state, resolved through the generic Media API.
        Keys use the SQL's 1-based suggestion ordinality.
        """

        if not artists_and_tracks:
            return AResult(code=AResultCode.OK, message="OK", result={})

        from backend.core.framework import providers

        fragments = [
            p.get_search_index_cte_fragment() for p in providers.get_media_providers()
        ]
        fragments = [f for f in fragments if f]

        if not fragments:
            return AResult(code=AResultCode.OK, message="OK", result={})

        search_index_cte = "\n\nUNION ALL\n\n".join(fragments)

        try:
            sql = text(f"""
            WITH search_index AS (
                {search_index_cte}
            ),
            candidates AS (
                SELECT
                    c.ordinality AS idx,
                    c.artist_name AS artist_name,
                    c.track_name  AS track_name
                FROM unnest(
                    CAST(:artist_names AS text[]),
                    CAST(:track_names AS text[])
                ) WITH ORDINALITY AS c(artist_name, track_name, ordinality)
            ),
            matches AS (
                SELECT c.idx AS idx,
                    si.public_id AS public_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY c.idx
                        ORDER BY word_similarity(lower(c.track_name), lower(si.name)) DESC,
                                 si.public_id
                    ) AS match_rank
                FROM   candidates  c
                JOIN   search_index si
                    ON  si.media_type_key = :song_type_key
                    AND word_similarity(lower(c.track_name), lower(si.name))
                        >= :name_threshold
                    AND word_similarity(lower(c.artist_name), lower(si.subtitle))
                        >= :artist_threshold
            )
            SELECT idx, public_id
            FROM   matches
            WHERE match_rank <= 3
            ORDER BY idx, match_rank
            """).bindparams(
                bindparam("artist_names", type_=ARRAY(String)),
                bindparam("track_names", type_=ARRAY(String)),
                bindparam("song_type_key", type_=Integer),
                bindparam("name_threshold", type_=Float),
                bindparam("artist_threshold", type_=Float),
            )

            rows = (
                await session.execute(
                    sql,
                    {
                        "artist_names": [a for a, _ in artists_and_tracks],
                        "track_names": [t for _, t in artists_and_tracks],
                        "song_type_key": MediaTypeEnum.SONG.value,
                        "name_threshold": DISCOVER_LIBRARY_NAME_MATCH_THRESHOLD,
                        "artist_threshold": DISCOVER_LIBRARY_ARTIST_MATCH_THRESHOLD,
                    },
                )
            ).fetchall()

            candidates: dict[int, list[str]] = {}
            for row in rows:
                candidates.setdefault(int(row[0]), []).append(str(row[1]))
            return AResult(code=AResultCode.OK, message="OK", result=candidates)
        except Exception as e:
            logger.error(
                f"Error matching discover suggestions to the library: {e}",
                exc_info=True,
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to match discover suggestions: {e}",
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

        Only providers that contribute genre data (through
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
