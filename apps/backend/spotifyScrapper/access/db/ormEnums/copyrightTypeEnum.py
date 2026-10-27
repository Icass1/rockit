from core.access.db.ormEnums.baseEnum import BaseEnumRow
from spotifyScrapper.access.db.base import SpotifyScrapperBase


class CopyrightTypeEnumRow(SpotifyScrapperBase, BaseEnumRow):
    __tablename__ = "copyright_type_enum"
    __table_args__ = ({"schema": "spotify_scrapper", "extend_existing": True},)
