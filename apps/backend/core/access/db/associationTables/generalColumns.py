from sqlalchemy import Column, func
from backend.core.access.db.ormModels.declarativeMixin import TZAwareTimestamp


def date_added_column():
    return Column("date_added", TZAwareTimestamp, nullable=False, default=func.now())


def date_updated_column():
    return Column(
        "date_updated",
        TZAwareTimestamp,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
    )
