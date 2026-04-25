from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class SpotifyBase(DeclarativeBase):
    metadata = MetaData(schema="spotify")
