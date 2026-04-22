import asyncio
from dataclasses import dataclass

import sys
import os

import requests

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import select


sys.path.append(".")


from backend.core.access.db.db import *
from backend.spotify.access.db.db import *
from backend.constants import IMAGES_PATH


@dataclass
class ConnectionInfo:
    username: str
    password: str
    host: str
    port: int
    database: str


def create_engine(
    connection_info: ConnectionInfo, verbose: bool = False
) -> AsyncEngine:
    connection_string = f"postgresql+asyncpg://{connection_info.username}:{connection_info.password}@{connection_info.host}:{connection_info.port}/{connection_info.database}"
    print(f"Using connection string '{connection_string}'")
    return create_async_engine(
        url=connection_string,
        echo=verbose,
    )


dst_connection_info = ConnectionInfo(
    username="admin",
    password="admin",
    host="rockit",
    port=5432,
    database="development_2",
)


async def main():
    dst_engine: AsyncEngine = create_engine(dst_connection_info, False)

    session_maker = async_sessionmaker(dst_engine, expire_on_commit=False)
    async with session_maker() as session:
        result = await session.execute(
            select(ImageRow)
            .where(ImageRow.url.like("https://i.scdn.co/image/%"))
            .execution_options(populate_existing=True)
        )

        images = result.unique().scalars().all()
        i = 0
        for image in images:

            if i % 100 == 0:
                await session.commit()

            try:
                if os.path.exists(os.path.join(IMAGES_PATH, image.path)):
                    print(f"Image already exists: {image.path}")
                else:
                    print(f"Image does not exist: {image.path}")

                    print("Downloading image")

                    if not image.url:
                        print(f"Image {image.id} has no URL, skipping")
                        continue

                    image.path = "spotify/" + image.public_id + ".jpg"

                    print("Setting image path to " + image.path)

                    response = requests.get(image.url, allow_redirects=True)
                    response.raise_for_status()

                    response_content = response.content
                    with open(os.path.join(IMAGES_PATH, image.path), "wb") as f:
                        f.write(response_content)

                    i += 1

            except Exception as e:
                print(f"Error downloading image {image.url}: {e}")
                continue


if __name__ == "__main__":
    asyncio.run(main())
