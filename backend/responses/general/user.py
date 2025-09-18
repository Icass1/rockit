from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from backend.responses.general.album import RockItAlbumResponse
from backend.responses.general.artist import RockItArtistResponse


class RockItSongResponse(BaseModel):
    publicId: str
    name: str
    artists: List[RockItArtistResponse]
    album: RockItAlbumResponse
    duration: int
    trackNumber: int
    discNumber: int
    internalImageUrl: Optional[str]
    downloadUrl: Optional[str]
    popularity: Optional[int]
    dateAdded: datetime
    isrc: str
