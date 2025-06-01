from backend.db.db import DB, SongsRow, UsersRow
import json


def main():

    db = DB()

    song: SongsRow = db.get(
        "SELECT * FROM songs WHERE id = '5gLJZBGkpvRXWbEbTcLIz8'")

    print(song.id)

    user: UsersRow = db.get(
        "SELECT * FROM users WHERE id = 'kor0r3n05o6ihak3'")

    print(user.admin, type(user.admin))
    print(user.date_added, type(user.date_added))
    print(user.queue_index, type(user.queue_index))

    # print(get_datetime_from_database_date(user.date_added))

    return

    playlist = db.get("SELECT * FROM playlist LIMIT 1")
    print(json.dumps(playlist, indent=4))

    user = db.get("SELECT * FROM user LIMIT 1")
    print(json.dumps(user, indent=4))

    error = db.get("SELECT * FROM error LIMIT 1")
    print(json.dumps(error, indent=4))

    for song in db.get_all("SELECT * FROM song LIMIT 2"):
        print(song["name"], song.get("artists")[0].get("name"))

    album = db.get("SELECT id,songs FROM album LIMIT 1")
    print(album["id"], album["songs"])

    download = db.get("SELECT * FROM download LIMIT 1")
    print(json.dumps(download, indent=4))


if __name__ == "__main__":
    main()
