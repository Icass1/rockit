

from logging import Logger
from typing import List
from fastapi import HTTPException
from sqlalchemy.future import select
from passlib.context import CryptContext

from backend.db.associationTables.user_queue_songs import user_queue_songs
from backend.db.ormModels.main.list import ListRow
from backend.db.ormModels.main.song import SongRow
from backend.db.ormModels.main.user import UserRow
from backend.init import rockit_db
from backend.responses.queueResponse import QueueResponse, QueueResponseItem, QueueResponseItemList
from backend.responses.rockItSongWithAlbumResponse import RockItSongWithAlbumResponse
from backend.utils.backendUtils import create_id
from backend.utils.logger import getLogger

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger: Logger = getLogger(__name__)


class UserAccess:

    @staticmethod
    def get_user_from_id(user_id: int) -> UserRow | None:

        with rockit_db.session_scope() as s:
            result: UserRow | None = s.get(UserRow, user_id)

            # Detach from session BEFORE closing session.
            s.expunge(result)
            return result

    @staticmethod
    def get_user_from_username(username: str) -> UserRow | None:
        with rockit_db.session_scope() as s:
            stmt = select(UserRow).where(UserRow.username == username)
            result: UserRow | None = s.execute(stmt).scalar_one_or_none()

            if not result:
                return None

            # Detach from session BEFORE closing session.
            s.expunge(result)
            return result

    @staticmethod
    def create_user(username: str, password: str) -> UserRow:
        password_hash: str = pwd.hash(password)

        with rockit_db.session_scope() as s:
            user = UserRow(
                public_id=create_id(),
                username=username,
                password_hash=password_hash
            )

            s.add(user)
            s.commit()
            s.refresh(user)
            s.expunge(user)

            return user

    @staticmethod
    def get_queue(user_id: int) -> QueueResponse:
        with rockit_db.session_scope() as s:
            user_row = s.query(UserRow).where(
                UserRow.id == user_id).first()

            if not user_row:
                logger.error("This should never happen. user_row is None.")
                raise HTTPException(status_code=500, detail="Song not found")

            stmt = select(user_queue_songs).where(
                user_queue_songs.c.user_id == user_row.id
            )

            result = s.execute(stmt).mappings().all()

            queue_items: List[QueueResponseItem] = []

            for row in result:
                list_row: ListRow | None = s.query(ListRow).where(
                    ListRow.id == row["list_id"]).first()

                if not list_row:
                    logger.error(
                        f"list_row is None. List id: {row['list_id']}")
                    continue

                queue_items.append(
                    QueueResponseItem(
                        song=RockItSongWithAlbumResponse.from_row(
                            s.query(SongRow).where(SongRow.id == row["song_id"]).first()),
                        queueSongId=row["queue_song_id"],
                        list=QueueResponseItemList(
                            type=row["list_type"],
                            publicId=list_row.public_id,
                        )
                    )
                )

        return QueueResponse(
            currentQueueSongId=user_row.queue_song_id,
            queue=queue_items
        )
