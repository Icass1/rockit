from typing import TYPE_CHECKING, Dict

from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy import ForeignKey, String, Integer, Text

from backend.core.access.db.base import Base
from backend.core.access.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId

if TYPE_CHECKING:
    from backend.core.access.db.ormModels.main.user import UserRow


class ErrorRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'errors'
    __table_args__ = {'schema': 'main', 'extend_existing': True},

    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey(
        'main.users.id'), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    line_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    column_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_name: Mapped[str | None] = mapped_column(String, nullable=True)
    error_stack: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["UserRow | None"] = relationship("UserRow", back_populates="errors",
                                                  foreign_keys=[user_id])

    def __init__(self, user_id: int  |  None = None, message: str  |  None = None, source: str  |  None = None, line_no: int  |  None = None, column_no: int  |  None = None, error_message: str  |  None = None, error_cause: str  |  None = None, error_name: str  |  None = None, error_stack: str  |  None = None):
        kwargs: Dict[str, int  |  None | str  |  None] = {}
        kwargs['user_id'] = user_id
        kwargs['message'] = message
        kwargs['source'] = source
        kwargs['line_no'] = line_no
        kwargs['column_no'] = column_no
        kwargs['error_message'] = error_message
        kwargs['error_cause'] = error_cause
        kwargs['error_name'] = error_name
        kwargs['error_stack'] = error_stack
        for k, v in kwargs.items():
            setattr(self, k, v)
