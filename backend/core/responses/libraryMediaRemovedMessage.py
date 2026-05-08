from pydantic import BaseModel
from typing import Literal


class LibraryMediaRemovedMessage(BaseModel):
    type: Literal["library_media_removed"] = "library_media_removed"
    publicId: str
