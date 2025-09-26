from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from backend.responses.general.album import RockItAlbumResponse
from backend.responses.general.artist import RockItArtistResponse


class RockItUserResponse(BaseModel):
    pass