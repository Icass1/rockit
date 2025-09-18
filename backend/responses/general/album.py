from typing import List
from pydantic import BaseModel

from backend.responses.general.copyright import RockItCopyrightResponse
from backend.responses.general.externalImage import RockItExternalImageResponse


class RockItAlbumResponse(BaseModel):
    publicId: str
    name: str
    copyrights: List[RockItCopyrightResponse]
    externalImages: List[RockItExternalImageResponse]
