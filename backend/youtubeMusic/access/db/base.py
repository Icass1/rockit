from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class YoutubeMusicBase(DeclarativeBase):
    metadata = MetaData(schema="youtube_music")
