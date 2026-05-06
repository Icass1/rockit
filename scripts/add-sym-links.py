import aiosqlite
import asyncio
import os


async def songs(db: aiosqlite.Connection):

    src = "/mnt/music/"

    dst = "/root/rockit-beta/media/spotify"

    async with db.execute("SELECT id, path FROM song") as cursor:
        rows = await cursor.fetchall()

        for row in rows:
            id = row[0]
            path = row[1]

            cmd: str = f'ln -s "{src}{path}" {dst}/{id}.mp3'

            os.system(cmd)


async def images(db: aiosqlite.Connection):
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

        cmd: str = f'ln -s "{src}/{image_path}" images/spotify/albums/{album_id}.png'
        os.system(cmd)


async def main():
    sqlite_file = "/root/rockit/database/database.db"

    async with aiosqlite.connect(sqlite_file) as db:

        await images(db)
        # await songs(db)


if __name__ == "__main__":
    asyncio.run(main())
