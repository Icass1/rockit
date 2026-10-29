from datetime import datetime

from sqlalchemy import Column, func

from core.access.db.ormModels.declarativeMixin import TZAwareTimestamp


def date_added_column() -> Column[datetime]:
    return Column("date_added", TZAwareTimestamp, nullable=False, default=func.now())


def date_updated_column() -> Column[datetime]:
    return Column(
        "date_updated",
        TZAwareTimestamp,
        nullable=False,
        default=func.now(),
        onupdate=func.now(),
    )
