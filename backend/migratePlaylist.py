import json
import sqlite3
import argparse
import asyncio
from logging import Logger

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.utils.backendUtils import create_id

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.media import CoreMediaRow
from backend.core.access.db.ormModels.image import ImageRow
from backend.core.access.db.ormModels.user_library_media import UserLibraryMediaRow
from backend.core.access.providerAccess import ProviderAccess
from backend.core.access.userAccess import UserAccess

from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.enums.playlistContributorRoleEnum import PlaylistContributorRoleEnum

from backend.core.framework.media.image import Image

from backend.spotify.access.db.ormModels.track import TrackRow

from backend.default.access.db.ormModels.playlist import PlaylistRow
from backend.default.access.db.ormModels.playlist_media import PlaylistMediaRow
from backend.default.access.db.ormModels.playlist_contributor import (
    PlaylistContributorRow,
)

logger: Logger = getLogger(__name__)


async def _get_default_provider_id(session: AsyncSession) -> AResult[int]:
    a_result = await ProviderAccess.get_providers(session=session)
    if a_result.is_not_ok():
        return AResult(code=a_result.code(), message=a_result.message())

    for provider in a_result.result():
        if provider.name == "Default" and not provider.disabled:
            return AResult(code=AResultCode.OK, message="OK", result=provider.id)

    return AResult(
        code=AResultCode.NOT_FOUND, message="Default provider not found in database"
    )


async def migrate_playlist_async(
    sqlite_path: str,
    playlist_id: str,
    target_user_id: int,
) -> None:
    logger.info(f"Connecting to SQLite: {sqlite_path}")

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()

    cursor.execute(
        "SELECT id, name, description, songs FROM playlist WHERE id = ?",
        (playlist_id,),
    )
    row = cursor.fetchone()
    if not row:
        logger.error(f"Playlist '{playlist_id}' not found in SQLite.")
        sqlite_conn.close()
        return

    playlist_name: str = row["name"]
    playlist_desc: str = row["description"] or ""
    songs_raw = row["songs"]

    songs_data: list[dict] = (
        json.loads(songs_raw) if isinstance(songs_raw, str) else songs_raw
    )
    spotify_ids: list[str] = [s["id"] for s in songs_data]
    logger.info(f"Playlist '{playlist_name}' has {len(spotify_ids)} songs")

    sqlite_conn.close()

    await rockit_db.wait_for_session_local_async()

    async with rockit_db.session_scope_async() as session:
        a_result_provider = await _get_default_provider_id(session=session)
        if a_result_provider.is_not_ok():
            logger.error(
                f"Default provider not found. Run init-db first. {a_result_provider.info()}"
            )
            return
        provider_id: int = a_result_provider.result()
        logger.info(f"Default provider id={provider_id}")

        a_result_user = await UserAccess.get_user_from_id(
            session=session, user_id=target_user_id
        )
        if a_result_user.is_not_ok():
            logger.error(f"User id={target_user_id} not found in PostgreSQL.")
            return
        logger.info(
            f"Target user: '{a_result_user.result().username}' (id={target_user_id})"
        )

        found_media_ids: list[int] = []
        missing_ids: list[str] = []

        for sid in spotify_ids:
            stmt = select(TrackRow).where(TrackRow.spotify_id == sid)
            result = await session.execute(stmt)
            track = result.scalar_one_or_none()
            if track:
                found_media_ids.append(track.id)
            else:
                missing_ids.append(sid)

        if not found_media_ids:
            logger.error("No songs from the playlist exist in the PostgreSQL database.")
            return

        logger.info(
            f"Matched {len(found_media_ids)}/{len(spotify_ids)} Spotify tracks in PostgreSQL"
        )
        if missing_ids:
            logger.warning(
                f"Missing {len(missing_ids)} tracks (first 10 shown): {missing_ids[:10]}"
            )

        a_result_image = await Image.get_image_from_path_async(
            session=session, path="playlist-placeholder.png"
        )
        if a_result_image.is_not_ok():
            logger.error(f"Placeholder image not found. {a_result_image.info()}")
            return
        image_row: ImageRow = a_result_image.result()

        core_media = CoreMediaRow(
            public_id=create_id(32),
            provider_id=provider_id,
            media_type_key=MediaTypeEnum.PLAYLIST.value,
        )
        session.add(core_media)
        await session.flush()
        await session.refresh(core_media)
        logger.info(
            f"Created CoreMediaRow id={core_media.id} public_id={core_media.public_id}"
        )

        playlist = PlaylistRow(
            id=core_media.id,
            name=playlist_name,
            image_id=image_row.id,
            owner_id=target_user_id,
            description=playlist_desc,
            is_public=True,
        )
        session.add(playlist)
        await session.flush()
        await session.refresh(playlist)

        contributor = PlaylistContributorRow(
            playlist_id=playlist.id,
            user_id=target_user_id,
            role_key=PlaylistContributorRoleEnum.OWNER.value,
        )
        session.add(contributor)

        library_entry = UserLibraryMediaRow(
            user_id=target_user_id,
            media_id=playlist.id,
        )
        session.add(library_entry)

        for idx, media_id in enumerate(found_media_ids):
            pm = PlaylistMediaRow(
                playlist_id=playlist.id,
                position=idx,
                media_id=media_id,
            )
            session.add(pm)

        await session.commit()

        logger.info(
            f"Migrated playlist '{playlist_name}' "
            f"(public_id: {core_media.public_id}) "
            f"with {len(found_media_ids)} songs."
        )


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Migrate a playlist from the legacy SQLite database.db to PostgreSQL"
    )
    parser.add_argument(
        "--db",
        type=str,
        default="database.db",
        help="Path to the SQLite database file (default: database.db)",
    )
    parser.add_argument(
        "--playlist-id",
        type=str,
        required=True,
        help="Playlist ID from the SQLite database (the string PK in the playlist table)",
    )
    parser.add_argument(
        "--user-id",
        type=int,
        required=True,
        help="Target user internal ID in PostgreSQL (core.user.id, not the public_id)",
    )
    args = parser.parse_args()

    await migrate_playlist_async(
        sqlite_path=args.db,
        playlist_id=args.playlist_id,
        target_user_id=args.user_id,
    )


if __name__ == "__main__":
    asyncio.run(main())
