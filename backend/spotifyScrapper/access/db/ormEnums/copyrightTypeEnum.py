from backend.spotifyScrapper.access.db.base import SpotifyScrapperBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class CopyrightTypeEnumRow(SpotifyScrapperBase, BaseEnumRow):
    __tablename__ = "copyright_type_enum"
    __table_args__ = ({"schema": "spotify_scrapper", "extend_existing": True},)
