import sys
import os


from constants import IMAGES_PATH, SONGS_PATH
from db.image import ImageDB
from db.album import AlbumDBFull
from db.song import SongDBFull
from logger import getLogger
from db.db import DB

logger = getLogger(__name__)


logger = getLogger(__name__)
db = DB()


def delete_album(album_id: str):

    logger.warning(f"Deleting album {album_id}")

    album_db: AlbumDBFull = db.get(
        "SELECT * FROM album WHERE id = ?", (album_id,))

    if not album_db:
        logger.error("Album not found")
        return

    for song_id in album_db.songs:
        delete_song(song_id)

    image_db: ImageDB = db.get(
        "SELECT * FROM image WHERE id = ?", (album_db.image,))

    if image_db:
        if image_db.path and os.path.exists(os.path.join(IMAGES_PATH, image_db.path)):
            os.remove(os.path.join(IMAGES_PATH, image_db.path))
            logger.info(f"Removed {os.path.join(IMAGES_PATH, image_db.path)}")
        else:
            logger.warning(f"Unable to delete file of image {image_db.id}")

        db.execute("DELETE FROM image WHERE id = ?", (image_db.id,))
        logger.info(f"Deleted image {album_id}")
    else:
        logger.warning(f"Album image not found in database")

    db.execute("DELETE FROM album WHERE id = ?", (album_id,))
    logger.info(f"Deleted album {album_id}")


def delete_song(song_id: str):
    logger.warning(f"Deleting song {song_id}...")

    song_db: SongDBFull = db.get("SELECT * FROM song WHERE id = ?", (song_id,))

    if not song_db:
        logger.error("Song not found")
        return

    if song_db.path and os.path.exists(os.path.join(SONGS_PATH, song_db.path)):
        os.remove(os.path.join(SONGS_PATH, song_db.path))
        logger.info(f"Removed {os.path.join(SONGS_PATH, song_db.path)}")
    else:
        logger.warning(f"Unable to delete file of song {song_id}")

    db.execute("DELETE FROM song WHERE id = ?", (song_id,))
    logger.info(f"Deleted song {song_id}")


def help_delete():
    print("Posible commands:")
    print("  delete album <id>")
    print("  delete song <id>")


def delete():
    if len(sys.argv) < 3:
        help_delete()
    elif sys.argv[2] == "album":
        delete_album(sys.argv[3])
    elif sys.argv[2] == "song":
        delete_song(sys.argv[3])
    else:
        logger.error("Unknow command")
        help_delete()


def help():
    print("Posible commands:")
    print("  delete")


if __name__ == "__main__":

    if len(sys.argv) < 2:
        help()
    elif sys.argv[1] == "delete":
        delete()
    else:
        logger.error("Unknow command")
        help()
