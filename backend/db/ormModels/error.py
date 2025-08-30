from typing import TYPE_CHECKING

from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy import ForeignKey, String, Integer, Text, ForeignKey

from backend.db.base import Base
from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.db.ormModels.user import UserRow


class ErrorRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'errors'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        'main.users.id'), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=True)
    line_no: Mapped[int] = mapped_column(Integer, nullable=True)
    column_no: Mapped[int] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    error_cause: Mapped[str] = mapped_column(Text, nullable=True)
    error_name: Mapped[str] = mapped_column(String, nullable=True)
    error_stack: Mapped[str] = mapped_column(Text, nullable=True)

    user: Mapped["UserRow"] = relationship("UserRow", back_populates="errors",
                                           foreign_keys=[user_id])
