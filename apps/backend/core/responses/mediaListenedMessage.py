from typing import Literal

from pydantic import BaseModel


class MediaListenedMessage(BaseModel):
    type: Literal["media_listened"] = "media_listened"
    publicId: str
