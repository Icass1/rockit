from sqlalchemy import create_engine, inspect
from contextlib import contextmanager
from typing import Generator, Callable, TypeVar
from sqlalchemy.orm import Session, sessionmaker

from backend.db.base import Base

from backend.db.ormModels.downloadStatus import DownloadStatusRow
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
        self.logger.info(f"Using connection string: '{connection_string}'")

        self.engine = create_engine(
            connection_string, echo=verbose)
        Base.metadata.create_all(self.engine)

        self.SessionLocal = sessionmaker(
            bind=self.engine, expire_on_commit=False)

        for model in Base.registry.mappers:
            self.check_model_vs_db(model.class_)

    def check(self):
        inspector = inspect(self.engine)

        for schema in inspector.get_schema_names():
            print(f"=== Schema: {schema} ===")
            for table_name in inspector.get_table_names(schema=schema):
                print(f"\nTable: {table_name}")

                # Columns
                for column in inspector.get_columns(table_name, schema=schema):
                    print(f"  Column: {column['name']} ({column['type']})"
                          f" - nullable={column['nullable']} "
                          f"- default={column.get('default')}")

                # Foreign keys
                for fk in inspector.get_foreign_keys(table_name, schema=schema):
                    print(
                        f"  Foreign key: {fk['constrained_columns']} -> {fk['referred_table']}({fk['referred_columns']})")

                # Primary key
                pk = inspector.get_pk_constraint(table_name, schema=schema)
                print(f"  Primary key: {pk['constrained_columns']}")

    def check_model_vs_db(self, model):

        inspector = inspect(self.engine)
        table = model.__table__
        table_name = table.name
        schema = table.schema or "main"
        print(f"\n=== Checking {schema}.{table_name} ===")

        db_columns = {col['name']: col for col in inspector.get_columns(
            table_name, schema=schema)}
        orm_columns = {col.name: col for col in table.columns}

        # ---- Column existence ----
        for col in orm_columns.keys() - db_columns.keys():
            print(f"⚠️ ORM-only column: {col}")
        for col in db_columns.keys() - orm_columns.keys():
            print(f"⚠️ DB-only column: {col}")

        # ---- Column type ----
        for col in orm_columns.keys() & db_columns.keys():
            orm_type = str(orm_columns[col].type)
            db_type = str(db_columns[col]["type"])
            if orm_type.lower() != db_type.lower():
                print(
                    f"⚠️ Type mismatch on {col}: ORM={orm_type}, DB={db_type}")

        # ---- Foreign keys ----
        orm_fks = set()
        for col in table.columns:
            for fk in col.foreign_keys:
                orm_fks.add(f"{table_name}.{col.name} -> {fk.target_fullname}")

        db_fks = set()
        for fk in inspector.get_foreign_keys(table_name, schema=schema):
            for local, remote in zip(fk["constrained_columns"], fk["referred_columns"]):
                db_fks.add(
                    f"{table_name}.{local} -> {fk['referred_table']}.{remote}")

        # Compare both directions
        for fk in orm_fks - db_fks:
            print(f"⚠️ ForeignKey in ORM but missing in DB: {fk}")

        for fk in db_fks - orm_fks:
            print(f"⚠️ ForeignKey in DB but missing in ORM: {fk}")

        if not (orm_fks - db_fks or db_fks - orm_fks):
            print("✅ Foreign keys match.")

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
