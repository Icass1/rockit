from typing import Optional
from pydantic import BaseModel


class UpdatePlaylistRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    isPublic: Optional[bool] = None
