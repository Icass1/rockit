

from logging import Logger
from sqlalchemy.future import select
from passlib.context import CryptContext

from backend.core.access.db import rockit_db
from backend.core.access.db.ormModels.user import UserRow
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
