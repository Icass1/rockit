from sqlalchemy import ForeignKey, String, Integer, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship, mapped_column

from backend.db.base import Base

from backend.db.ormModels.declarativeMixin import TableDateAdded, TableDateUpdated, TableAutoincrementId


class DownloadRow(Base, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = 'downloads'
    __table_args__ = {'schema': 'main', 'extend_existing': True},
    user_id = mapped_column(Integer, ForeignKey(
        'main.users.id'), nullable=False)
    date_started = mapped_column(DateTime(timezone=False), nullable=False)
    date_ended = mapped_column(DateTime(timezone=False), nullable=True)
    download_url = mapped_column(String, nullable=False)
    status = mapped_column(Enum("pending", "in_progress", "completed",
                                "failed", name="download_status_enum", schema="main"), nullable=False, default="pending")
    seen = mapped_column(Boolean, nullable=False, default=False)
    success = mapped_column(Integer, nullable=True)
    fail = mapped_column(Integer, nullable=True)

    user = relationship("UserRow", back_populates="downloads",
                        foreign_keys=[user_id])
