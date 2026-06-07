from typing import Dict, List, TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormModels.declarativeMixin import (
    TableDateAdded,
    TableDateUpdated,
    TableAutoincrementId,
)
from backend.core.access.db.ormModels.media import CoreMediaRow

if TYPE_CHECKING:
    from backend.radioBrowser.access.db.ormModels.tag import TagRow
    from backend.radioBrowser.access.db.ormModels.languageCode import (
        LanguageCodeRow,
    )
    from backend.radioBrowser.access.db.ormModels.country import CountryRow
    from backend.radioBrowser.access.db.ormModels.state import StateRow
    from backend.radioBrowser.access.db.ormModels.codec import CodecRow


class StationRow(CoreBase, TableAutoincrementId, TableDateUpdated, TableDateAdded):
    __tablename__ = "station"
    __table_args__ = ({"schema": "radio_browser", "extend_existing": True},)

    id: Mapped[int] = mapped_column(
        Integer, ForeignKey("core.media.id"), primary_key=True
    )
    radio_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    stream_url: Mapped[str] = mapped_column(String, nullable=False)
    homepage: Mapped[str | None] = mapped_column(String, nullable=True)
    favicon_url: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str | None] = mapped_column(String, nullable=True)
    bitrate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    votes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    geo_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    geo_long: Mapped[float | None] = mapped_column(Float, nullable=True)

    country_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("radio_browser.country.id"), nullable=True
    )
    state_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("radio_browser.state.id"), nullable=True
    )
    codec_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("radio_browser.codec.id"), nullable=True
    )

    core_station: Mapped["CoreMediaRow"] = relationship(
        CoreMediaRow, lazy="selectin", uselist=False
    )
    tags_rel: Mapped[List["TagRow"]] = relationship(
        "TagRow",
        secondary="radio_browser.station_tag",
        back_populates="stations",
        lazy="selectin",
    )
    language_codes_rel: Mapped[List["LanguageCodeRow"]] = relationship(
        "LanguageCodeRow",
        secondary="radio_browser.station_language_code",
        back_populates="stations",
        lazy="selectin",
    )
    country_rel: Mapped["CountryRow | None"] = relationship(
        "CountryRow",
        back_populates="stations",
        lazy="selectin",
    )
    state_rel: Mapped["StateRow | None"] = relationship(
        "StateRow",
        back_populates="stations",
        lazy="selectin",
    )
    codec_rel: Mapped["CodecRow | None"] = relationship(
        "CodecRow",
        back_populates="stations",
        lazy="selectin",
    )

    def __init__(
        self,
        id: int,
        radio_id: str,
        name: str,
        stream_url: str,
        homepage: str | None = None,
        favicon_url: str | None = None,
        language: str | None = None,
        bitrate: int | None = None,
        votes: int | None = None,
        geo_lat: float | None = None,
        geo_long: float | None = None,
        country_id: int | None = None,
        state_id: int | None = None,
        codec_id: int | None = None,
    ):
        kwargs: Dict[str, None | float | int | str] = {}
        kwargs["id"] = id
        kwargs["radio_id"] = radio_id
        kwargs["name"] = name
        kwargs["stream_url"] = stream_url
        kwargs["homepage"] = homepage
        kwargs["favicon_url"] = favicon_url
        kwargs["language"] = language
        kwargs["bitrate"] = bitrate
        kwargs["votes"] = votes
        kwargs["geo_lat"] = geo_lat
        kwargs["geo_long"] = geo_long
        kwargs["country_id"] = country_id
        kwargs["state_id"] = state_id
        kwargs["codec_id"] = codec_id
        for k, v in kwargs.items():
            setattr(self, k, v)
