from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class DefaultBase(DeclarativeBase):
    metadata = MetaData(schema="default_schema")
