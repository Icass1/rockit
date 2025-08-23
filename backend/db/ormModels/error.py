from sqlalchemy import ForeignKey, String, Integer, Text, ForeignKey

from sqlalchemy.orm import relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class ErrorRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'errors'
    __table_args__ = {'schema': 'main', 'extend_existing': True},
    user_id = mapped_column(Integer, ForeignKey(
        'main.users.id'), nullable=True)
    message = mapped_column(Text, nullable=True)
    source = mapped_column(String, nullable=True)
    line_no = mapped_column(Integer, nullable=True)
    column_no = mapped_column(Integer, nullable=True)
    error_message = mapped_column(Text, nullable=True)
    error_cause = mapped_column(Text, nullable=True)
    error_name = mapped_column(String, nullable=True)
    error_stack = mapped_column(Text, nullable=True)

    user = relationship("UserRow", back_populates="errors",
                        foreign_keys=[user_id])
