#!/usr/bin/env python
"""One-time migration to fix corrupted YouTube CoreMediaRow public_ids."""

import asyncio

from sqlalchemy import text

from backend.utils.logger import getLogger
from backend.core.access.db import rockit_db

logger = getLogger(__name__)


async def fix_youtube_media_public_ids() -> None:
    """Fix corrupted CoreMediaRow entries for YouTube videos and channels."""

    await rockit_db.wait_for_session_local_async()

    async with rockit_db.session_scope_async() as session:
        logger.info("Starting migration to fix YouTube media public_ids...")

        await session.execute(text("""
                UPDATE core.media AS m
                SET public_id = 'youtube:' || v.youtube_id
                FROM youtube.video AS v
                WHERE m.id = v.id
                  AND m.public_id NOT LIKE 'youtube:%'
                  AND v.youtube_id IS NOT NULL
            """))
        await session.commit()
        logger.info("Updated video records")

        await session.execute(text("""
                UPDATE core.media AS m
                SET public_id = 'youtube_channel:' || c.youtube_id
                FROM youtube.channel AS c
                WHERE m.id = c.id
                  AND m.public_id NOT LIKE 'youtube_channel:%'
                  AND c.youtube_id IS NOT NULL
            """))
        await session.commit()
        logger.info("Updated channel records")

    logger.info("Migration complete!")


if __name__ == "__main__":
    asyncio.run(fix_youtube_media_public_ids())
