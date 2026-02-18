from sqlalchemy import TIMESTAMP, Column, func


def date_added_column():
    return Column("date_added", TIMESTAMP(timezone=True), nullable=False, default=func.now())


def date_updated_column():
    return Column("date_updated", TIMESTAMP(timezone=True), nullable=False, default=func.now(), onupdate=func.now())
