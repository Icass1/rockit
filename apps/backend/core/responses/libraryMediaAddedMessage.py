from typing import Literal

from pydantic import BaseModel


class LibraryMediaAddedMessage(BaseModel):
    type: Literal["library_media_added"] = "library_media_added"
    publicId: str
