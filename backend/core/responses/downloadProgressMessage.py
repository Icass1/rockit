from pydantic import BaseModel
from typing import Literal


class DownloadProgressMessage(BaseModel):
    type: Literal["download_progress"]
    download_id: int
    publicId: str
    title: str
    subTitle: str
    status: str
    progress: float
    message: str
