from datetime import datetime
from pydantic import BaseModel

from backend.db.associationTables.playlist_songs import PlaylistSongLink
from backend.responses.rockItSongWithAlbumResponse import RockItSongWithAlbumResponse


class RockItSongPlaylistResponse(BaseModel):
    addedAt: datetime
    song: RockItSongWithAlbumResponse
    disabled: bool

    @staticmethod
    def from_row(row: PlaylistSongLink):
        return RockItSongPlaylistResponse(
            addedAt=row.added_at,
            song=RockItSongWithAlbumResponse.from_row(row.song),
            disabled=row.disabled
        )
