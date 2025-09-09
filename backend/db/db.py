from sqlalchemy import create_engine
from contextlib import contextmanager
from typing import Generator, Callable, TypeVar
from sqlalchemy.orm import Session, sessionmaker

from backend.db.base import Base

from backend.db.ormModels.externalImage import ExternalImageRow
from backend.db.ormModels.internalImage import InternalImageRow
from backend.db.ormModels.copyright import CopyrightRow
from backend.db.ormModels.download import DownloadRow
from backend.db.ormModels.playlist import PlaylistRow
from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.genre import GenreRow
from backend.db.ormModels.error import ErrorRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.list import ListRow
from backend.db.ormModels.user import UserRow
from backend.utils.logger import getLogger

T = TypeVar("T")


class RockitDB:
    def __init__(self, username: str, password: str, host: str, port: int, database: str, verbose: bool = False):
        """
        Initialize the RockitDB instance and create a database session.
        """
        self.database: str = database

        self.logger = getLogger(__name__, "RockitDB")

        connection_string = f"postgresql://{username}:{password}@{host}:{port}/{self.database}?sslmode=disable"

        self.engine = create_engine(
            connection_string, echo=verbose)
        Base.metadata.create_all(self.engine)

        self.SessionLocal = sessionmaker(
            bind=self.engine, expire_on_commit=False)

        self.logger.info(f"Using connection string: '{connection_string}'")

    def get_session(self) -> Session:
        """
        Create a new database session. 
        Must be closed by the caller.
        """
        return self.SessionLocal()

    def close(self) -> None:
        """
        Dispose of the engine (optional cleanup).
        """
        self.engine.dispose()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around a series of operations."""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception as e:
            self.logger.error(f"Error executing query ({e}). Rolling back...")
            session.rollback()
            raise
        finally:
            session.close()

    def execute_with_session(self, func: Callable[[Session], T]) -> T:
        """Execute a function with a session, auto-closing and rolling back on errors."""
        with self.session_scope() as session:
            return func(session)
