import sys
import os


from backend.db.playlist import PlaylistDBFull
from backend.constants import IMAGES_PATH, SONGS_PATH
from backend.db.image import ImageDB
from backend.db.album import AlbumDBFull
from backend.db.song import SongDBFull
from backend.logger import getLogger
from backend.db.db import DB

logger = getLogger(__name__)


logger = getLogger(__name__)
db = DB()


def delete_album(album_id: str):

    album_db: AlbumDBFull = db.get(
        "SELECT * FROM album WHERE id = ?", (album_id,))

    if not album_db:
        logger.error(f"{album_id} album not found")
        return

    logger.warning(f"Deleting album {album_db.id} - {album_db.name}")

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
        logger.info(f"Deleted image {image_db.id}")
    else:
        logger.warning(f"Album image not found in database")

    db.execute("DELETE FROM album WHERE id = ?", (album_id,))
    logger.info(f"Deleted album {album_id}")


def delete_song(song_id: str):

    song_db: SongDBFull = db.get("SELECT * FROM song WHERE id = ?", (song_id,))

    if not song_db:
        logger.error(f"{song_id} song not found")
        return

    logger.warning(f"Deleting song {song_db.id} - {song_db.name}")

    if song_db.path and os.path.exists(os.path.join(SONGS_PATH, song_db.path)):
        os.remove(os.path.join(SONGS_PATH, song_db.path))
        logger.info(f"Removed {os.path.join(SONGS_PATH, song_db.path)}")
    else:
        logger.warning(f"Unable to delete file of song {song_id}")

    db.execute("DELETE FROM song WHERE id = ?", (song_id,))
    logger.info(f"Deleted song {song_id}")


def delete_playlist(playlist_id: str):

    playlist_db: PlaylistDBFull = db.get(
        "SELECT * FROM playlist WHERE id = ?", (playlist_id,))

    if not playlist_db:
        logger.error(f"{playlist_id} playlist not found")
        return

    logger.warning(f"Deleting playlist {playlist_id} - {playlist_db.name}")

    for song in playlist_db.songs:
        delete_song(song.id)

    image_db: ImageDB = db.get(
        "SELECT * FROM image WHERE id = ?", (playlist_db.image,))

    if image_db:
        if image_db.path and os.path.exists(os.path.join(IMAGES_PATH, image_db.path)):
            os.remove(os.path.join(IMAGES_PATH, image_db.path))
            logger.info(f"Removed {os.path.join(IMAGES_PATH, image_db.path)}")
        else:
            logger.warning(f"Unable to delete file of image {image_db.id}")

        db.execute("DELETE FROM image WHERE id = ?", (image_db.id,))
        logger.info(f"Deleted image {image_db.id}")
    else:
        logger.warning(f"Playlist image not found in database")

    db.execute("DELETE FROM playlist WHERE id = ?", (playlist_id,))
    logger.info(f"Deleted playlist {playlist_id} - {playlist_db.name}")


def help_delete():
    print("Posible commands:")
    print("  delete album <id>")
    print("  delete song <id>")
    print("  delete playlist <id>")


def delete():
    if len(sys.argv) < 3:
        help_delete()
    elif sys.argv[2] == "album":
        delete_album(sys.argv[3])
    elif sys.argv[2] == "song":
        delete_song(sys.argv[3])
    elif sys.argv[2] == "playlist":
        delete_playlist(sys.argv[3])
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
