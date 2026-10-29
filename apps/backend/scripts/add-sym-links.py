import asyncio
import os

import aiosqlite


async def songs(db: aiosqlite.Connection) -> None:

    src = "/mnt/music/"

    dst = "/root/rockit-beta/media/spotify"

    async with db.execute("SELECT id, path FROM song") as cursor:
        rows = await cursor.fetchall()

        for row in rows:
            id = row[0]
            path = row[1]

            os.symlink(f"{src}{path}", f"{dst}/{id}.mp3")


async def images(db: aiosqlite.Connection) -> None:
    async with db.execute("SELECT id, path FROM image") as cursor:
        images = await cursor.fetchall()

    async with db.execute("SELECT id, image FROM album") as cursor:
        albums = await cursor.fetchall()

    src = "/mnt/music/_images"

    for album in albums:
        album_id = album[0]
        album_image = album[1]

        image_path: str | None = None

        for image in images:
            image_id = image[0]
            _image_path = image[1]

            if image_id == album_image:
                image_path = _image_path
                break

        else:
            print(f"Image not found for album {album_id}")
            continue

        os.symlink(f"{src}/{image_path}", f"images/spotify/albums/{album_id}.png")


async def main() -> None:
    sqlite_file = "/root/rockit/database/database.db"

    async with aiosqlite.connect(sqlite_file) as db:
        await images(db)
        # await songs(db)


if __name__ == "__main__":
    asyncio.run(main())
