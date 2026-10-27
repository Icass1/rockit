from core.access.db.ormEnums.baseEnum import BaseEnumRow
from spotify.access.db.base import SpotifyBase


class CopyrightTypeEnumRow(SpotifyBase, BaseEnumRow):
    __tablename__ = "copyright_type_enum"
    __table_args__ = ({"schema": "spotify", "extend_existing": True},)
