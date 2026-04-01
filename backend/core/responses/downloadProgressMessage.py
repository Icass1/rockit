from pydantic import BaseModel


class DownloadProgressMessage(BaseModel):
    type: str = "download_progress"
    download_id: int
    publicId: str
    title: str
    artist: str
    status: str
    progress: float
    message: str
