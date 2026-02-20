from datetime import datetime

from sqlalchemy import TIMESTAMP, Integer, String, func
from sqlalchemy.orm import mapped_column, declarative_mixin, Mapped


@declarative_mixin
class TableDateUpdated:
    date_updated: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        default=func.now(),
        onupdate=func.now()
    )


@declarative_mixin
class TableDateAdded:
    date_added: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
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


@declarative_mixin
class TablePublicId:
    public_id: Mapped[str] = mapped_column(String, nullable=False)


@declarative_mixin
class TableAutoincrementKey:
    key: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
