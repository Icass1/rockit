from sqlalchemy import Table, create_engine, inspect
from contextlib import contextmanager
from typing import Generator, Callable, TypeVar
from sqlalchemy.orm import Session, sessionmaker

from backend.db.base import Base

from backend.db.ormModels.main.downloadStatus import DownloadStatusRow
from backend.db.ormModels.main.externalImage import ExternalImageRow
from backend.db.ormModels.main.internalImage import InternalImageRow
from backend.db.ormModels.main.copyright import CopyrightRow
from backend.db.ormModels.main.download import DownloadRow
from backend.db.ormModels.main.playlist import PlaylistRow
from backend.db.ormModels.main.artist import ArtistRow
from backend.db.ormModels.main.album import AlbumRow
from backend.db.ormModels.main.genre import GenreRow
from backend.db.ormModels.main.error import ErrorRow
from backend.db.ormModels.main.song import SongRow
from backend.db.ormModels.main.list import ListRow
from backend.db.ormModels.main.user import UserRow

from backend.db.ormModels.spotify_cache.playlist import SpotifyCachePlaylistRow
from backend.db.ormModels.spotify_cache.artist import SpotifyCacheArtistRow
from backend.db.ormModels.spotify_cache.album import SpotifyCacheAlbumRow
from backend.db.ormModels.spotify_cache.track import SpotifyCacheTrackRow

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
        self.logger.info(f"Using connection string: '{connection_string}'")

        self.engine = create_engine(
            connection_string, echo=verbose)
        Base.metadata.create_all(self.engine)

        self.SessionLocal = sessionmaker(
            bind=self.engine, expire_on_commit=False)

        for mapper in Base.registry.mappers:
            self.check_table_schema(mapper.class_.__table__)

        for table in Base.metadata.tables.values():
            if not any(mapper.class_.__table__ is table for mapper in Base.registry.mappers):
                self.check_table_schema(table)

    def check_table_schema(self, table: Table):
        inspector = inspect(self.engine)

        """Compare ORM Table definition vs actual database table."""
        schema = table.schema or "main"
        table_name = table.name

        # Get DB table info
        try:
            db_columns = {col['name']: col for col in inspector.get_columns(
                table_name, schema=schema)}
        except Exception as e:
            self.logger.error(
                f"Table not found in DB: {schema}.{table_name} ({e})")
            return

        orm_columns = {col.name: col for col in table.columns}

        # --- Column existence ---
        for col in orm_columns.keys() - db_columns.keys():
            self.logger.error(f"ORM-only column: {col}")
        for col in db_columns.keys() - orm_columns.keys():
            self.logger.error(f"DB-only column: {col}")

        # --- Column type ---
        for col in orm_columns.keys() & db_columns.keys():
            orm_type = str(orm_columns[col].type)
            db_type = str(db_columns[col]["type"])
            if orm_type.lower() != db_type.lower():
                self.logger.error(
                    f"Type mismatch on {col}: ORM={orm_type}, DB={db_type}")

        # --- Foreign keys ---
        orm_fks = set()
        for col in table.columns:
            for fk in col.foreign_keys:
                orm_fks.add(f"{table_name}.{col.name} -> {fk.target_fullname}")

        db_fks = set()
        for fk in inspector.get_foreign_keys(table_name, schema=schema):
            for local, remote in zip(fk["constrained_columns"], fk["referred_columns"]):
                db_fks.add(
                    f"{table_name}.{local} -> {schema}.{fk['referred_table']}.{remote}")

        # Compare both directions
        for fk in orm_fks - db_fks:
            self.logger.error(f"ForeignKey in ORM but missing in DB: {fk}")
        for fk in db_fks - orm_fks:
            self.logger.error(f"ForeignKey in DB but missing in ORM: {fk}")

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
