from backend.core.access.db.base import CoreBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class PlaylistContributorRoleEnumRow(CoreBase, BaseEnumRow):
    __tablename__ = "playlist_contributor_role_enum"
    __table_args__ = ({"schema": "core", "extend_existing": True},)
