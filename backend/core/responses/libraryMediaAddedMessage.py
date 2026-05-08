from pydantic import BaseModel
from typing import Literal


class LibraryMediaAddedMessage(BaseModel):
    type: Literal["library_media_added"] = "library_media_added"
    publicId: str
