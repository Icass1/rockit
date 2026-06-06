from typing import Dict

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)
from backend.core.access.db.ormModels.media import CoreMediaRow


class StationRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "station"
    __table_args__ = ({"schema": "radio", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    radio_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    stream_url: Mapped[str] = mapped_column(String, nullable=False)
    homepage: Mapped[str | None] = mapped_column(String, nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    country_code: Mapped[str | None] = mapped_column(String, nullable=True)
    state: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    language_codes: Mapped[str | None] = mapped_column(String, nullable=True)
    codec: Mapped[str | None] = mapped_column(String, nullable=True)
    bitrate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tags: Mapped[str | None] = mapped_column(String, nullable=True)
    votes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    core_station: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )

    def __init__(
        self,
        id: int,
        radio_id: str,
        name: str,
        stream_url: str,
        homepage: str | None = None,
        favicon_url: str | None = None,
        country: str | None = None,
        country_code: str | None = None,
        state: str | None = None,
        language: str | None = None,
        language_codes: str | None = None,
        codec: str | None = None,
        bitrate: int | None = None,
        tags: str | None = None,
        votes: int | None = None,
    ):
        kwargs: Dict[str, None | int | str] = {}
        kwargs["id"] = id
        kwargs["radio_id"] = radio_id
        kwargs["name"] = name
        kwargs["stream_url"] = stream_url
        kwargs["homepage"] = homepage
        kwargs["favicon_url"] = favicon_url
        kwargs["country"] = country
        kwargs["country_code"] = country_code
        kwargs["state"] = state
        kwargs["language"] = language
        kwargs["language_codes"] = language_codes
        kwargs["codec"] = codec
        kwargs["bitrate"] = bitrate
        kwargs["tags"] = tags
        kwargs["votes"] = votes
        for k, v in kwargs.items():
            setattr(self, k, v)
