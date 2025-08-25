import sys
import os

sys.path.append(os.getcwd())  # noqa
sys.path.append(os.getcwd() + "/backend")  # noqa


from backend.db.db import RockitDB, AlbumRow, ArtistRow, SongRow
from typing import List
from sqlalchemy import select
from sqlalchemy.orm import joinedload

rockit_db = RockitDB()
session = rockit_db.get_session()


album_id = 1

album: AlbumRow | None = session.execute(
    select(AlbumRow)
    .options(
        joinedload(AlbumRow.artists),              # Load album → artists
        joinedload(AlbumRow.songs)
        .joinedload(SongRow.artists)           # Load songs → artists
    )
    .where(AlbumRow.id == album_id)
).unique().scalar_one_or_none()


if album:
    print(album.name)
    album.name = "test album name"
    print(type(album.name))
    artists: List[ArtistRow] = album.artists

    print("album.songs", artists[0].songs)
else:
    print("Album not found")
