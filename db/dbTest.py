import os
import sys
from typing import List, Sequence, Tuple

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.engine.row import Row

sys.path.append(os.getcwd())  # noqa
sys.path.append(os.getcwd() + "/backend")  # noqa

from backend.db.ormModels.playlist import PlaylistRow
from backend.logger import getLogger

from backend.db.associationTables.song_artists import song_artists
from backend.db.associationTables.user_history_songs import user_history_songs
from backend.db.db import RockitDB, UserRow, AlbumRow, ArtistRow, SongRow, ListRow

rockit_db = RockitDB(verbose=False)
session = rockit_db.get_session()

logger = getLogger("dbTest")

# album_id = 1

# album: AlbumRow | None = session.execute(
#     select(AlbumRow)
#     .options(
#         joinedload(AlbumRow.artists),              # Load album → artists
#         joinedload(AlbumRow.songs)
#         .joinedload(SongRow.artists)           # Load songs → artists
#     )
#     .where(AlbumRow.id == album_id)
# ).unique().scalar_one_or_none()


# if album:
#     print(album.name)
#     artists: List[ArtistRow] = album.artists
#     print(f"{artists[0].name=}")

#     print(f"{artists[0].songs=}")

#     for song in artists[0].songs:
#         print(song.name, [(user.username, user.super_admin,
#               user.volume, user.admin) for user in song.queued_by_users])

# else:
#     print("Album not found")

# print("\n\n")
# user: UserRow | None = session.execute(
#     select(UserRow)
#     .options(
#         joinedload(UserRow.lists)
#         .joinedload(ListRow.album)
#         .joinedload(AlbumRow.songs),
#         joinedload(UserRow.lists)
#         .joinedload(ListRow.playlist)
#         .joinedload(PlaylistRow.songs)
#     )
#     .where(UserRow.id == 1)
# ).unique().scalar_one_or_none()

# if user:
#     logger.info(
#         f"{user.admin=}, {user.volume=}, {user.super_admin=}, {user.username=}")
#     for list in user.lists:
#         if list.album:
#             logger.info(f"{list.album.name=}, {len(list.album.songs)=}")
#         elif list.playlist:
#             logger.info(f"{list.playlist.name}, {len(list.playlist.songs)}")
# else:
#     print("User not found")


# result = session.execute(
#     select(user_history_songs.c.played_at, SongRow.name, ArtistRow.name)
#     .join(SongRow, user_history_songs.c.song_id == SongRow.id)
#     .join(song_artists, song_artists.c.song_id == SongRow.id)
#     .join(ArtistRow, song_artists.c.artist_id == ArtistRow.id).where(user_history_songs.c.user_id == 1)
#     .order_by(user_history_songs.c.played_at.desc())
#     .limit(10)
# ).all()


# for k in result:
#     logger.info(k)


# songs_in_db: Sequence[Row[Tuple[int, str, str | None]]] = session.execute(select(SongRow.id, SongRow.public_id, SongRow.path).where(
#     SongRow.id.in_([1, 2, 3, 4]))).all()

# print("\n\n\n\n")
# for k in songs_in_db:
#     a = k._mapping[SongRow.id]


albums_in_db: Sequence[AlbumRow] = session.execute(select(AlbumRow).where(
    AlbumRow.id.in_([1, 2, 3, 4]))).scalars().all()

print("\n\n\n\n")
for k in albums_in_db:
    print(k)
