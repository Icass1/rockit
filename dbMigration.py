import sqlite3
from sqlalchemy import create_engine
from backend.db.db import Album, Base
from sqlalchemy.orm import Session
import json

from datetime import datetime

engine = create_engine("sqlite:///database/database.db", echo=False)
Base.metadata.create_all(engine)

session = Session(engine)


conn = sqlite3.connect(
    'file:database/back.database.2025.06.01.db?mode=ro', check_same_thread=False)
cursor = conn.cursor()


cursor.execute("SELECT * FROM album")

albums = cursor.fetchall()

for album in albums:
    id = album[0]
    type = album[1]
    images = json.loads(album[2])
    image_id = album[3]
    name = album[4]
    release_date = album[5]
    artists = json.loads(album[6])
    copyrights = json.loads(album[7])
    popularity = album[8]
    genres = album[9]
    songs = json.loads(album[10])
    disc_count = album[11]
    date_added = album[12]
    # print(album)

    albums_to_add = Album(
        id=id, name=name, image_id=image_id, release_date=release_date, disc_count=disc_count, date_added=datetime.now(), popularity=popularity)

    session.add(albums_to_add)

    # for index, value in enumerate(album):
    #     print(index, value)

    # break

session.commit()
