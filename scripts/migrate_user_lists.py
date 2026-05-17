# type: ignore

import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

sys.path.append(".")

from backend.core.access.db.db import *
from backend.spotify.access.db.db import *

data = [
    {"createdAt": 1737573696704, "type": "album", "id": "1KFWgQTw3EMTQebaaepVBI"},
    {"createdAt": 1737576470133, "type": "album", "id": "3cQO7jp5S9qLBoIVtbkSM1"},
    {"createdAt": 1737576474300, "type": "album", "id": "6rgWZP4QFBjEFF0n6JWEOa"},
    {"createdAt": 1737576580287, "type": "album", "id": "621cXqrTSSJi1WqDMSLmbL"},
    {"createdAt": 1737576679892, "type": "album", "id": "0Q5XBpCYFgUWiG9DUWyAmJ"},
    {"createdAt": 1737576710435, "type": "album", "id": "2x6LWti2bjYS6AllSomoV7"},
    {"createdAt": 1737576771483, "type": "album", "id": "1bwbZJ6khPJyVpOaqgKsoZ"},
    {"createdAt": 1737576786043, "type": "album", "id": "0jV32pIk8l3vTaU3thTaW2"},
    {"createdAt": 1737653172943, "type": "playlist", "id": "4et5MOGY0pmO252496uSaG"},
    {"createdAt": 1740396949852, "type": "album", "id": "6mUdeDZCsExyJLMdAfDuwh"},
    {"createdAt": 1740399157366, "type": "album", "id": "2cWBwpqMsDJC1ZUwz813lo"},
    {"createdAt": 1740406958106, "type": "album", "id": "5IBigZKJt8uffeMjKw5uEl"},
    {"createdAt": 1740407775668, "type": "album", "id": "6wlsUpq6NrapsweMIOKt0y"},
    {"createdAt": 1740474477063, "type": "album", "id": "19AUoKWRAaQYrggVvdQnqq"},
    {"createdAt": 1740474526143, "type": "album", "id": "7tsXPtLqhab1zWeubbf6JH"},
    {"createdAt": 1740474642142, "type": "album", "id": "6pUg9RDDoVyQQVJ48FkmXz"},
    {"createdAt": 1740474697288, "type": "album", "id": "4JnL4N9xWOWrQIF7rCdEXH"},
    {"createdAt": 1740474735752, "type": "album", "id": "33pt9HBdGlAbRGBHQgsZsU"},
    {"createdAt": 1740474837443, "type": "album", "id": "6yiXkzHvC0OTmhfDQOEWtS"},
    {"createdAt": 1740489932390, "type": "album", "id": "0fLhefnjlIV3pGNF9Wo8CD"},
    {"createdAt": 1740493974344, "type": "album", "id": "6i6folBtxKV28WX3msQ4FE"},
    {"createdAt": 1740557399307, "type": "album", "id": "3VWrUk4vBznMYXGMPc7dRB"},
    {"createdAt": 1740561791778, "type": "album", "id": "4vu7F6h90Br1ZtYYaqfITy"},
    {"createdAt": 1740604602433, "type": "album", "id": "5QWHes9ODwn42DHTifGkXd"},
    {"createdAt": 1740604791565, "type": "album", "id": "6v2mSLE5CO0qXmxdIEAnLq"},
    {"createdAt": 1740604828119, "type": "album", "id": "5pXpUs3iFvHtERCkLkrEIi"},
    {"createdAt": 1740604833562, "type": "album", "id": "1SZfmTvRqaMEK8xS2sLcU1"},
    {"createdAt": 1740604842440, "type": "album", "id": "0FaEN18H11E8YUwFeOzibR"},
    {"createdAt": 1740604861928, "type": "album", "id": "2ANVost0y2y52ema1E9xAZ"},
    {"createdAt": 1740604943098, "type": "album", "id": "1kf3w2zcfjNYpx1NjnJmQ8"},
    {"createdAt": 1740605038618, "type": "album", "id": "1GbtB4zTqAsyfZEsm1RZfx"},
    {"createdAt": 1740605102890, "type": "album", "id": "2yuTRGIackbcReLUXOYBqU"},
    {"createdAt": 1740605145106, "type": "album", "id": "7Kmmw7Z5D2UD5MVwdm10sT"},
    {"createdAt": 1740605257835, "type": "album", "id": "7EPrkhjTBrwAV8yAKCmY0Y"},
    {"createdAt": 1740606424556, "type": "album", "id": "6nxDQi0FeEwccEPJeNySoS"},
    {"createdAt": 1742140141994, "type": "album", "id": "2r2r78NE05YjyHyVbVgqFn"},
    {"createdAt": 1742798923151, "type": "album", "id": "3JfSxDfmwS5OeHPwLSkrfr"},
    {"createdAt": 1745395826759, "type": "playlist", "id": "4YMyO0HmcJFEXhUWH147vL"},
    {"createdAt": 1746306678392, "type": "album", "id": "5qkGe4UpUa8dsokzuroQ72"},
    {"createdAt": 1746653385242, "type": "album", "id": "3fSSAHjqml1DUmMNJk1OMW"},
    {"createdAt": 1748330962208, "type": "album", "id": "5y6wlw1LnqFnQFruMeiwGU"},
    {"createdAt": 1754912110127, "type": "album", "id": "1B61NzknoGqafMfKLY7QtZ"},
    {"createdAt": 1755843820269, "type": "album", "id": "1bU12iHHt5ujHbuKcIGlpm"},
    {"createdAt": 1757534527433, "type": "album", "id": "2FgwL1GHWKTbuHzAIjEeFa"},
    {"createdAt": 1757628482635, "type": "album", "id": "1El3k8dU3sKyoGUeuyrolH"},
    {"createdAt": 1759588251135, "type": "album", "id": "6tkjU4Umpo79wwkgPMV3nZ"},
]


USER_ID = 10


async def migrate(session: AsyncSession):
    album_spotify_ids = [item["id"] for item in data if item["type"] == "album"]

    result = await session.execute(
        select(AlbumRow).where(AlbumRow.spotify_id.in_(album_spotify_ids))
    )
    albums = result.scalars().all()

    print(f"Found {len(albums)} albums in database")

    for album in albums:
        existing = await session.execute(
            select(UserLibraryMediaRow).where(
                UserLibraryMediaRow.user_id == USER_ID,
                UserLibraryMediaRow.media_id == album.id,
            )
        )
        if existing.scalar_one_or_none():
            print(f"Album '{album.name}' already in library, skipping")
            continue

        library_entry = UserLibraryMediaRow(user_id=USER_ID, media_id=album.id)
        session.add(library_entry)
        print(f"Added album '{album.name}' to library")

    await session.commit()
    print("Migration complete")


async def main():
    from backend.constants import DB_HOST, DB_USER, DB_PASSWORD, DB_PORT

    connection_string = (
        f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/production"
    )
    engine = create_async_engine(url=connection_string, echo=False)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    session = session_maker()
    try:
        await migrate(session)
    finally:
        await session.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
