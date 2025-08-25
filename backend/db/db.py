from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.db.base import Base

from backend.db.ormModels.externalImage import ExternalImageRow
from backend.db.ormModels.internalImage import InternalImageRow
from backend.db.ormModels.download import DownloadRow
from backend.db.ormModels.playlist import PlaylistRow
from backend.db.ormModels.artist import ArtistRow
from backend.db.ormModels.album import AlbumRow
from backend.db.ormModels.genre import GenreRow
from backend.db.ormModels.error import ErrorRow
from backend.db.ormModels.song import SongRow
from backend.db.ormModels.list import ListRow
from backend.db.ormModels.user import UserRow


class RockitDB:
    def __init__(self):
        """
        Initialize the RockitDB instance and create a database session.
        """
        engine = create_engine(
            "postgresql://admin:admin@12.12.12.3:5432/development?sslmode=disable", echo=False)
        Base.metadata.create_all(engine)

        self.session = Session(engine)

    def get_session(self) -> Session:
        """
        Get the current database session.
        """
        return self.session

    def close_session(self) -> None:
        """
        Close the current database session.
        """
        self.session.close()
