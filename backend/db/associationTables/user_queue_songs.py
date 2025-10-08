from typing import Final, Literal
from sqlalchemy import Table, Column, ForeignKey, Enum, Integer

from backend.db.base import Base

from backend.db.associationTables.generalColumns import date_added_column, date_updated_column


QUEUE_LIST_TYPE: Final[tuple[str, ...]] = (
    "album",
    "playlist",
    "carousel",
    "library",
    "recently-played",
    "recent-mix"
)

QUEUE_LIST_TYPE_TYPE = Literal[
    "album",
    "playlist",
    "carousel",
    "library",
    "recently-played",
    "recent-mix"
]


user_queue_songs = Table(
    'user_queue_songs', Base.metadata,
    Column('user_id', ForeignKey('main.users.id'), primary_key=True),
    Column('song_id', ForeignKey('main.songs.id'), primary_key=True),
    Column('position', Integer, nullable=False),
    Column('queue_song_id', Integer, nullable=False),
    Column('list_type', Enum(*QUEUE_LIST_TYPE,
           name="user_queue_songs_list_type_enum", schema="main"), nullable=False),
    Column('list_id', ForeignKey('main.lists.id'), nullable=False),
    date_added_column(),
    date_updated_column(),
    schema='main'
)
