
from backend.spotify.access.db.base import SpotifyBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class DownloadStatusEnumRow(SpotifyBase, BaseEnumRow):
    __tablename__ = 'download_status_enum'
    __table_args__ = {'schema': 'spotify', 'extend_existing': True},
