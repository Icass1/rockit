from logging import Logger
from typing import List

from sqlalchemy import Float, Integer, String, bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.models.searchIndex import SearchIndexEntry
from backend.core.utils.safeAsyncCall import safe_async
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)

EXACT_MATCH_SCORE = 100.0

# pg_trgm's own default operator threshold (`pg_trgm.similarity_threshold`); below
# this a name isn't considered a plausible fuzzy match.
FUZZY_SCORE_CUTOFF = 30.0


class AdminSearchAccess:
    @staticmethod
    @safe_async
    async def search_media_index_async(
        session: AsyncSession, query: str, limit: int
    ) -> AResult[List[SearchIndexEntry]]:
        """Search every searchable media item (song, album, artist, video, playlist,
        radio station, ...) across all providers that contribute a search index
        fragment.

        Ranks exact internal id / public id matches first, then by PostgreSQL
        trigram similarity (pg_trgm) on both the item name and its related
        context (e.g. artist / channel / album names in the subtitle column),
        and applies the limit directly in the database instead of scoring the
        full catalog in Python.
        """

        from backend.core.framework import providers

        fragments = [
            p.get_search_index_cte_fragment() for p in providers.get_media_providers()
        ]
        fragments = [f for f in fragments if f]

        if not fragments:
            return AResult(code=AResultCode.OK, message="OK", result=[])

        search_index_cte = "\n\nUNION ALL\n\n".join(fragments)
        query_id = int(query) if query.isdigit() else None

        sql = f"""
        WITH search_index AS (
            {search_index_cte}
        )
        SELECT
            internal_id,
            public_id,
            name,
            subtitle,
            media_type_key,
            provider_name,
            image_url,
            score
        FROM (
            SELECT
                si.*,
                CASE
                    WHEN :query_id IS NOT NULL AND si.internal_id = :query_id THEN :exact_score
                    WHEN si.public_id = :query THEN :exact_score
                    WHEN starts_with(si.public_id, :query) THEN :exact_score
                    ELSE GREATEST(
                        similarity(lower(si.name), lower(:query)),
                        word_similarity(lower(:query), lower(si.name)),
                        similarity(lower(si.subtitle), lower(:query)),
                        word_similarity(lower(:query), lower(si.subtitle))
                    ) * 100.0
                END AS score
            FROM search_index si
        ) ranked
        WHERE score >= :score_cutoff
        ORDER BY score DESC
        LIMIT :limit
        """

        result = await session.execute(
            text(sql).bindparams(
                bindparam("query", value=query, type_=String),
                # explicit Integer type required: query_id is None for non-numeric
                # queries, and asyncpg can't infer a NULL param's type on its own.
                bindparam("query_id", value=query_id, type_=Integer),
                bindparam("exact_score", value=EXACT_MATCH_SCORE, type_=Float),
                bindparam("score_cutoff", value=FUZZY_SCORE_CUTOFF, type_=Float),
                bindparam("limit", value=limit, type_=Integer),
            )
        )
        rows = result.fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                SearchIndexEntry(
                    internal_id=int(row[0]),
                    public_id=row[1],
                    name=row[2],
                    subtitle=row[3],
                    media_type_key=int(row[4]),
                    provider_name=row[5],
                    image_url=row[6],
                    score=float(row[7]),
                )
                for row in rows
            ],
        )
