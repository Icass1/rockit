
from datetime import datetime

from sqlalchemy.future import select

from backend.db.ormModels.main.session import SessionRow
from backend.init import rockit_db


class SessionAccess:

    @staticmethod
    def create_session(session_id: str, user_id: int, expires_at: datetime) -> SessionRow:

        with rockit_db.session_scope() as s:
            session = SessionRow(
                session_id=session_id,
                user_id=user_id,
                expires_at=expires_at
            )

            s.add(session)
            s.commit()
            s.refresh(session)
            s.expunge(session)

            return session

    @staticmethod
    def get_session_from_id(session_id: str) -> None | SessionRow:
        with rockit_db.session_scope() as s:
            stmt = select(SessionRow).where(
                SessionRow.session_id == session_id)
            result: SessionRow | None = s.execute(stmt).scalar_one_or_none()

            if not result:
                return None

            # Detach from session BEFORE closing session.
            s.expunge(result)
            return result
