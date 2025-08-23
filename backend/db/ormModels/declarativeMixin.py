
from sqlalchemy import Integer, func, DateTime
from sqlalchemy.orm import mapped_column, declarative_mixin, Mapped
from datetime import datetime

@declarative_mixin
class TableDateUpdated:
    date_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        default=func.now(),
        onupdate=func.now()
    )


@declarative_mixin
class TableDateAdded:
    date_added: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
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