from pydantic import BaseModel
from typing import Literal


class MediaListenedMessage(BaseModel):
    type: Literal["media_listened"] = "media_listened"
    publicId: str
