from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class CoreBase(DeclarativeBase):
    metadata = MetaData(schema="core")
