from typing import Optional
from pydantic import BaseModel


class CreatePlaylistRequest(BaseModel):
    name: str
    description: Optional[str] = None
    isPublic: bool = True
