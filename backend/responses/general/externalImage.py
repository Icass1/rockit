from typing import Optional
from pydantic import BaseModel


class RockItExternalImageResponse(BaseModel):
    url: str
    width: Optional[int]
    height: Optional[int]