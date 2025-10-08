from typing import List
from pydantic import BaseModel

from backend.db.associationTables.user_queue_songs import QUEUE_LIST_TYPE_TYPE
from backend.responses.general.songWithAlbum import RockItSongWithAlbumResponse


class QueueResponseItemList(BaseModel):
    type: QUEUE_LIST_TYPE_TYPE
    publicId: str


class QueueResponseItem(BaseModel):
    song: RockItSongWithAlbumResponse
    queueSongId: int
    list: QueueResponseItemList


class QueueResponse(BaseModel):
    currentQueueSongId: int | None
    queue: List[QueueResponseItem]
