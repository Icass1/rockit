from typing import Optional

from pydantic import BaseModel


class AddFromUrlRequest(BaseModel):
    url: str
    playlistPublicId: Optional[str] = None
