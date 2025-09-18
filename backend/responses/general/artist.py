from typing import List
from pydantic import BaseModel


class RockItArtistResponse(BaseModel):
    publicId: str
    name: str
    genres: List[str]