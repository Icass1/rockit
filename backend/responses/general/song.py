from pydantic import BaseModel

from typing import List

class SongGeneralResponse(BaseModel):
    id: str
    name: str
    artists: List[ArtistGeneralResponse]
    album: AlbumGeneralResponse
    duration 
    image
