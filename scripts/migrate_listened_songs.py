# type: ignore

import asyncio
from dataclasses import dataclass
import aiosqlite
import json

import sys

import datetime

from flask import session
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert


sys.path.append(".")


from backend.core.access.db.db import *
from backend.spotify.access.db.db import *


@dataclass
class ConnectionInfo:
    username: str
    password: str
    host: str
    port: int
    database: str


dst_connection_info = ConnectionInfo(
    username="admin",
    password="admin",
    host="rockit",
    port=5432,
    database="development_2",
)


def create_engine(
    connection_info: ConnectionInfo, verbose: bool = False
) -> AsyncEngine:
    connection_string = f"postgresql+asyncpg://{connection_info.username}:{connection_info.password}@{connection_info.host}:{connection_info.port}/{connection_info.database}"
    print(f"Using connection string '{connection_string}'")
    return create_async_engine(
        url=connection_string,
        echo=verbose,
    )


def parse_date(date: str | int) -> datetime.datetime:
    """Takes a date like 1746129686748 or '2025-05-14T18:42:18.816Z' and returns it as 2026-04-14 22:54:29.138957+00"""

    if isinstance(date, int):
        date = datetime.datetime.utcfromtimestamp(date / 1000).isoformat() + "Z"

    dt = datetime.datetime.fromisoformat(date.replace("Z", "+00:00"))
    return dt


async def process_last_played_song(
    session: AsyncSession, last_played_song: str
) -> int | None:

    data: dict[str, list[str | int]] = json.loads(last_played_song)

    track_ids = data.keys()

    if len(track_ids) == 0:
        print("No songs found in lastPlayedSong")
        return None

    if len(track_ids) != len(list(set(track_ids))):
        print("Duplicate track IDs found in lastPlayedSong")
        return None

    result = await session.execute(
        select(TrackRow).where(TrackRow.spotify_id.in_(track_ids))
    )

    data_in_db = result.unique().scalars().all()

    values: list[dict[str, str | int]] = []

    for track_spotify_id in data:

        dates_listened = data[track_spotify_id]

        track_in_db = next(
            (track for track in data_in_db if track.spotify_id == track_spotify_id),
            None,
        )
        if not track_in_db:
            print(f"Track with Spotify ID '{track_spotify_id}' not found in database")
            continue

        for date_listened in dates_listened:
            values.append(
                {
                    "user_id": 2,
                    "media_id": track_in_db.id,
                    "date_added": parse_date(date_listened),
                }
            )

    max_batch_size = 1000
    for i in range(0, len(values), max_batch_size):

        stmt = insert(UserMediaListenedRow).values(values[i : i + max_batch_size])
        stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "date_added"])

        await session.execute(stmt)

    await session.commit()


async def main():
    user = "icass"
    sqlite_file = "database.db"

    verbose = False

    dst_engine: AsyncEngine = create_engine(dst_connection_info, verbose)

    session_maker = async_sessionmaker(dst_engine, expire_on_commit=False)

    async with aiosqlite.connect(sqlite_file) as db:
        async with db.execute(
            "SELECT lastPlayedSong FROM user WHERE username = ?", (user,)
        ) as cursor:
            row = await cursor.fetchone()

            if row:
                session = session_maker()
                try:
                    await process_last_played_song(session, row[0])
                finally:
                    await session.close()
            else:
                print("User not found")


if __name__ == "__main__":
    asyncio.run(main())
