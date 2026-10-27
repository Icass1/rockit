from typing import Literal

from pydantic import BaseModel


class LibraryMediaRemovedMessage(BaseModel):
    type: Literal["library_media_removed"] = "library_media_removed"
    publicId: str
