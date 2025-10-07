from datetime import datetime

from sqlalchemy import TIMESTAMP, Integer, func
from sqlalchemy.orm import mapped_column, declarative_mixin, Mapped


@declarative_mixin
class TableDateUpdated:
    date_updated: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        nullable=False,
        default=func.now(),
        onupdate=func.now()
    )


@declarative_mixin
class TableDateAdded:
    date_added: Mapped[datetime] = mapped_column(
        TIMESTAMP,
        nullable=False,
        default=func.now(),
    )


@declarative_mixin
class TableAutoincrementId:
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
