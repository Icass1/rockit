from backend.default.access.db.base import DefaultBase
from backend.core.access.db.ormEnums.baseEnum import BaseEnumRow


class PlaylistContributorRoleEnumRow(DefaultBase, BaseEnumRow):
    __tablename__ = "playlist_contributor_role_enum"
    __table_args__ = ({"extend_existing": True},)
