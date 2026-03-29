from pydantic import BaseModel


class DownloadProgressMessage(BaseModel):
    type: str = "download_progress"
    publicId: str
    download_id: int
    status: str
    progress: float
    message: str
