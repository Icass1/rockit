from sqlalchemy import Column, func, DateTime


def date_added_column():
    return Column("date_added", DateTime(timezone=False), nullable=False, default=func.now())


def date_updated_column():
    return Column("date_updated", DateTime(timezone=False), nullable=False, default=func.now(), onupdate=func.now())
