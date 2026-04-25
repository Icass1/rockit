from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class YoutubeBase(DeclarativeBase):
    metadata = MetaData(schema="youtube")
