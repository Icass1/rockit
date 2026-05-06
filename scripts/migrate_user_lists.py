# type: ignore

import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import select

sys.path.append(".")

from backend.core.access.db.db import *
from backend.spotify.access.db.db import *

data = [
    {"createdAt": 1732546633392, "type": "album", "id": "3IILMjMMnoN2sKzgesX8KV"},
    {"createdAt": 1732567648508, "type": "album", "id": "7vEJAtP3KgKSpOHVgwm3Eh"},
    {"createdAt": 1734297467572, "type": "playlist", "id": "7h6r9ScqSjCHH3QozfBdIq"},
    {"createdAt": 1734297574707, "type": "album", "id": "7ygXmT175bKbOpiPjNwXOB"},
    {"createdAt": 1734703395261, "type": "album", "id": "5WupqgR68HfuHt3BMJtgun"},
    {"createdAt": 1735214784908, "type": "album", "id": "3usnShwygMXVZB4IV5dwnU"},
    {"createdAt": 1736252923253, "type": "playlist", "id": "3FNBAUPEmMANEWpY2fMMXb"},
    {"createdAt": 1737460327950, "type": "album", "id": "2ZytN2cY4Zjrr9ukb2rqTP"},
    {"createdAt": 1737460416715, "type": "album", "id": "655KljKIXl42fiNDMKivbY"},
    {"createdAt": 1737460525622, "type": "album", "id": "1kM6xcSYO5ASJaWgygznL7"},
    {"createdAt": 1737467416062, "type": "playlist", "id": "0kqz3FKC3yz3L1sJTqmRCh"},
    {"createdAt": 1737467707592, "type": "playlist", "id": "3u4naniXCbTKLVPabZLrnq"},
    {"createdAt": 1739436094294, "type": "album", "id": "1G40QqbxYWEeelWqf4hpbI"},
    {"createdAt": 1742420559913, "type": "album", "id": "2S12TNfqdnUFdTfYlE96tb"},
    {"createdAt": 1742658027075, "type": "album", "id": "5PQPur1PEZFDkI0AXbxFlB"},
    {"createdAt": 1742658156119, "type": "album", "id": "78MOBi69w1MH2IyjWVKv2g"},
    {"createdAt": 1744103255609, "type": "album", "id": "71Y6kburF8k1qyHycovHy8"},
    {"createdAt": 1744150205938, "type": "album", "id": "6wlsUpq6NrapsweMIOKt0y"},
    {"createdAt": 1745151146564, "type": "album", "id": "2IIoRTMSjA1fTv11MdpGMj"},
    {"createdAt": 1745445794380, "type": "album", "id": "5Fliz4RQcDktb93l1uYDka"},
    {"createdAt": 1745701326315, "type": "album", "id": "77ErLrVvYETIlQJHAwhfIH"},
    {"createdAt": 1745701968923, "type": "album", "id": "3KzAvEXcqJKBF97HrXwlgf"},
    {"createdAt": 1746380918718, "type": "album", "id": "6HuHvPC7L7MiJgkqpZlmH4"},
    {"createdAt": 1746397856971, "type": "album", "id": "6fQElzBNTiEMGdIeY0hy5l"},
    {"createdAt": 1748349568766, "type": "album", "id": "5JLKZcOSNXcm6xaX1vI7nB"},
    {"createdAt": 1748354033851, "type": "album", "id": "5TNzBp7QYsXIHrI5xxVuic"},
    {"createdAt": 1748354090023, "type": "album", "id": "1CvVSn2MtKDBR6aWMkNkem"},
    {"createdAt": 1748354152149, "type": "album", "id": "1Jv2AqzhgsduUik2p4k3cS"},
    {"createdAt": 1748354203699, "type": "album", "id": "321q9p7PELvzcFAWxml7VX"},
    {"createdAt": 1748354216971, "type": "album", "id": "6mUdeDZCsExyJLMdAfDuwh"},
    {"createdAt": 1748354243427, "type": "album", "id": "2ANVost0y2y52ema1E9xAZ"},
    {"createdAt": 1748354278369, "type": "album", "id": "5tXZfxvr2VaWibD74nw8VL"},
    {"createdAt": 1748354324252, "type": "album", "id": "2xQBCPq2gQ7l8thLUUZSKu"},
    {"createdAt": 1748354411654, "type": "album", "id": "19AUoKWRAaQYrggVvdQnqq"},
    {"createdAt": 1748354445748, "type": "album", "id": "1GbtB4zTqAsyfZEsm1RZfx"},
    {"createdAt": 1748355577273, "type": "album", "id": "6Pz06FAaeym0JSqVqIkN56"},
    {"createdAt": 1748355604070, "type": "album", "id": "0OmYuz9hwn1XoqmDaU0yJ7"},
    {"createdAt": 1748355608191, "type": "album", "id": "1bt6q2SruMsBtcerNVtpZB"},
    {"createdAt": 1748355621158, "type": "album", "id": "3PRoXYsngSwjEQWR5PsHWR"},
    {"createdAt": 1748355631384, "type": "album", "id": "6oIaXBTIZ2Q9cJKBgrZ2Ox"},
    {"createdAt": 1748355649590, "type": "album", "id": "3R3x4zIabsvpD3yxqLaUpc"},
    {"createdAt": 1749121480131, "type": "album", "id": "163iYwl7Kdm9ayTnD4VyfN"},
    {"createdAt": 1749121517362, "type": "album", "id": "5sztejERqpktXEdemlUvU5"},
    {"createdAt": 1749121539502, "type": "album", "id": "7dsWupQRlFuhG8FGiQAUjC"},
    {"createdAt": 1749121605560, "type": "album", "id": "2wrHaulTgqqkVKx0k7Kq4r"},
    {"createdAt": 1749121616553, "type": "album", "id": "4X87hQ57jTYQTcYTaJWK5w"},
    {"createdAt": 1749121626036, "type": "album", "id": "6RfgcwsOUlWkGNAd6zjjYd"},
    {"createdAt": 1749121646036, "type": "album", "id": "7mEjsBlRmfP63cH1gdPT6A"},
    {"createdAt": 1749121694455, "type": "album", "id": "7a35UzxXYuKQGMGImyB0Un"},
    {"createdAt": 1749121706813, "type": "album", "id": "1HmCO8VK98AU6EXPOjGYyI"},
    {"createdAt": 1751966902698, "type": "album", "id": "7CWZNdANL2ZYQs3JfdxoM5"},
    {"createdAt": 1753826009495, "type": "album", "id": "6ZT56fuNORmVhYclVoaTiu"},
    {"createdAt": 1755528541577, "type": "album", "id": "5RS9xkMuDmeVISqGDBmnSa"},
    {"createdAt": 1758463521468, "type": "album", "id": "4hJqOIahWodpSJU6uDgjvN"},
    {"createdAt": 1760735315243, "type": "album", "id": "7mR7KayHWdrjAMMvwpJpZA"},
    {"createdAt": 1764322057111, "type": "playlist", "id": "3kEIv7XoaGnLUL8p9dAof1"},
    {"createdAt": 1764935399136, "type": "playlist", "id": "7Lu7nM9igHl4RBD2YdTNWD"},
]


USER_ID = 2


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
