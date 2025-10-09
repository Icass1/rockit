import json
from typing import List

from pydantic import BaseModel
from sqlalchemy import Delete, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.dialects.postgresql.dml import Insert

from backend.db.associationTables.user_queue_songs import user_queue_songs
from backend.db.ormModels.main.list import ListRow
from backend.db.ormModels.main.song import SongRow
from backend.db.ormModels.main.user import UserRow
from backend.utils.logger import getLogger

from backend.init import rockit_db

logger = getLogger(__name__)


class QueueItemList(BaseModel):
    type: str
    publicId: str


class QueueItem(BaseModel):
    list: QueueItemList
    song: str
    queueSongId: int


class Queue(BaseModel):
    queue: List[QueueItem]


CURRENT_TIME = "currentTime"
QUEUE = "queue"
QUEUE_SONG_ID = "queueSongId"


def process_websocket(user_id: int, message: str):

    try:
        message_parsed = json.loads(message)
    except Exception as e:
        logger.error(f"Unable to parse websocket message. ({e=})")
        return

    with rockit_db.session_scope() as s:
        user_row = s.query(UserRow).where(UserRow.id == user_id).first()
        if not user_row:
            logger.error(f"This should never happen. user_row is None.")
            return

        if CURRENT_TIME in message_parsed:
            user_row.current_time = message_parsed[CURRENT_TIME]
        elif QUEUE in message_parsed:
            queue: Queue = Queue.model_validate(message_parsed)

            delete_stmt: Delete = delete(user_queue_songs).where(
                user_queue_songs.c.user_id == user_id)
            s.execute(delete_stmt)

            insert_stmt: Insert = insert(user_queue_songs).values([{
                "user_id": user_id,
                "song_id": s.query(SongRow).where(SongRow.public_id == queue_item.song).first().id,
                "position": index,
                "queue_song_id": queue_item.queueSongId,
                "list_type": queue_item.list.type,
                "list_id": s.query(ListRow).where(ListRow.public_id == queue_item.list.publicId).first().id
            } for index, queue_item in enumerate(queue.queue)])
            s.execute(insert_stmt)

        elif QUEUE_SONG_ID in message_parsed:
            user_row.queue_song_id = message_parsed[QUEUE_SONG_ID]
        else:
            logger.info(f"Unkown message {message_parsed}")
